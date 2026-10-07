import * as React from 'react';
import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import ReactModal from 'react-modal';
import {
  CurrentPresentation,
  PluginApi,
  pluginLogger,
} from 'bigbluebutton-html-plugin-sdk';

interface UserMetadataEntry {
  parameter: string;
  value: string;
}

interface QuizScheduleItem {
  id: string;
  resource_id: string;
  title: string;
  trigger_resource_id: string;
  trigger_slide_number: number;
}

interface QuizRun {
  id: string;
  status: 'open' | 'closed';
  closes_at: string;
  remaining_seconds: number;
  response_count: number;
  participant_count: number;
  selected_option: number | null;
  correct_option?: number;
  quiz: {
    id: string;
    title: string;
    question: string;
    options: string[];
    duration_seconds: number;
  };
  results?: {
    correct_option: number;
    option_counts: number[];
    correct_count: number;
  };
}

interface QuizRuntimeResponse {
  is_moderator: boolean;
  schedule: QuizScheduleItem[];
  active_run: QuizRun | null;
}

interface QuizControl {
  action: 'open' | 'close';
  runId: string;
}

interface SynapseQuizRuntimeProps {
  pluginApi: PluginApi;
  currentPresentation?: CurrentPresentation;
  userMetadata?: UserMetadataEntry[];
}

const modalStyle: ReactModal.Styles = {
  overlay: {
    zIndex: 1100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    backgroundColor: 'rgba(3, 15, 31, 0.76)',
    backdropFilter: 'blur(5px)',
  },
  content: {
    position: 'relative',
    inset: 'auto',
    width: 'min(760px, calc(100vw - 32px))',
    maxHeight: 'min(760px, calc(100vh - 32px))',
    overflow: 'hidden',
    border: '0',
    borderRadius: '24px',
    padding: '0',
    background: '#f8fafc',
    boxShadow: '0 30px 100px rgba(0, 0, 0, 0.42)',
  },
};

function runtimeUrlWithRun(runtimeUrl: string, runId: string): string {
  const url = new URL(runtimeUrl);
  url.searchParams.set('run_id', runId);
  return url.toString();
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || 'Không thể kết nối quiz.');
  return payload as T;
}

export default function SynapseQuizRuntime({
  pluginApi,
  currentPresentation,
  userMetadata,
}: SynapseQuizRuntimeProps): React.ReactElement {
  const runtimeUrl = userMetadata?.find(
    (entry) => entry.parameter === 'synapseQuiz_runtimeUrl',
  )?.value;
  const { data: quizControl, pushEntry: pushQuizControl } = pluginApi
    .useDataChannel<QuizControl>('synapseQuiz');
  const latestQuizControl = quizControl.data?.[quizControl.data.length - 1]?.payloadJson;
  const [schedule, setSchedule] = useState<QuizScheduleItem[]>([]);
  const [activeRun, setActiveRun] = useState<QuizRun | null>(null);
  const [isModerator, setIsModerator] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [error, setError] = useState('');
  const startedQuizIds = useRef<Set<string>>(new Set());
  const dismissedRunIds = useRef<Set<string>>(new Set());

  const loadRuntime = useCallback(async (runId?: string) => {
    if (!runtimeUrl) return;
    try {
      const response = await fetch(runId ? runtimeUrlWithRun(runtimeUrl, runId) : runtimeUrl);
      const payload = await readJson<QuizRuntimeResponse>(response);
      setSchedule(payload.schedule);
      setIsModerator(payload.is_moderator);
      if (payload.active_run && !dismissedRunIds.current.has(payload.active_run.id)) {
        setActiveRun(payload.active_run);
        setSelectedOption(payload.active_run.selected_option);
      }
      setError('');
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Không thể tải quiz.';
      setError(message);
      pluginLogger.error(`Synapse quiz runtime error: ${message}`);
    }
  }, [runtimeUrl]);

  useEffect(() => {
    void loadRuntime();
  }, [loadRuntime]);

  useEffect(() => {
    if (!latestQuizControl?.runId) return;
    void loadRuntime(latestQuizControl.runId);
  }, [latestQuizControl?.runId, loadRuntime]);

  useEffect(() => {
    if (!runtimeUrl) return undefined;
    const timer = window.setInterval((): void => {
      // Keep discovering an open run even before the first quiz appears.
      // A viewer may join before the teacher starts the quiz or miss the
      // transient data-channel event during a reconnect. The runtime API is
      // the source of truth and returns the currently open run without a
      // run_id, so polling it makes student delivery self-healing.
      void loadRuntime(activeRun?.id);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [activeRun?.id, loadRuntime, runtimeUrl]);

  useEffect(() => {
    const pageTextUrl = currentPresentation?.currentPage?.urlsJson?.text;
    const pageNumber = Number(currentPresentation?.currentPage?.num);
    // Use the signed runtime role instead of BBB's transient presenter flag.
    // The presenter hook can briefly (or, after a reconnect, permanently) report
    // false even though the classroom owner is the moderator allowed to start a quiz.
    if (!isModerator || !runtimeUrl || !Number.isFinite(pageNumber) || schedule.length === 0) return;

    const scheduledForPage = schedule.filter(
      (item) => item.trigger_slide_number === pageNumber,
    );
    const startQuiz = (quiz?: QuizScheduleItem) => {
      if (!quiz || startedQuizIds.current.has(quiz.id)) return;
      startedQuizIds.current.add(quiz.id);
      fetch(runtimeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', quiz_id: quiz.id }),
      })
        .then((response) => readJson<QuizRun>(response))
        .then((run) => {
          if (run.status !== 'open') return;
          setActiveRun(run);
          pushQuizControl({ action: 'open', runId: run.id });
        })
        .catch((requestError) => {
          startedQuizIds.current.delete(quiz.id);
          setError(requestError instanceof Error ? requestError.message : 'Không thể mở quiz.');
        });
    };
    const startOnlyQuizScheduledForPage = () => {
      // BBB does not always expose/fetch the extracted text URL to plugins.
      // Falling back is unambiguous only when this page number has one quiz.
      if (scheduledForPage.length === 1) startQuiz(scheduledForPage[0]);
    };

    if (!pageTextUrl) {
      startOnlyQuizScheduledForPage();
      return;
    }
    fetch(pageTextUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then((pageText) => {
        const marker = pageText.match(
          /SYNAPSE_RESOURCE:([0-9a-f-]+);SYNAPSE_PAGE:(\d+)/i,
        );
        if (!marker) {
          startOnlyQuizScheduledForPage();
          return;
        }
        const [, resourceId, pageNumberText] = marker;
        const quiz = schedule.find((item) => (
          item.trigger_resource_id.toLowerCase() === resourceId.toLowerCase()
          && item.trigger_slide_number === Number(pageNumberText)
        ));
        startQuiz(quiz);
      })
      .catch((requestError) => {
        pluginLogger.error(
          `Could not read the current slide for Synapse quiz: ${requestError.message}`,
        );
        startOnlyQuizScheduledForPage();
      });
  }, [
    currentPresentation?.presentationId,
    currentPresentation?.currentPage?.num,
    isModerator,
    runtimeUrl,
    schedule,
  ]);

  const submitAnswer = async () => {
    if (!runtimeUrl || !activeRun || selectedOption === null) return;
    try {
      const response = await fetch(runtimeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'answer',
          run_id: activeRun.id,
          selected_option: selectedOption,
        }),
      });
      setActiveRun(await readJson<QuizRun>(response));
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể gửi đáp án.');
    }
  };

  const closeQuiz = async () => {
    if (!runtimeUrl || !activeRun) return;
    try {
      const response = await fetch(runtimeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', run_id: activeRun.id }),
      });
      const run = await readJson<QuizRun>(response);
      setActiveRun(run);
      pushQuizControl({ action: 'close', runId: run.id });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể đóng quiz.');
    }
  };

  if (!runtimeUrl) return null;
  const answered = activeRun?.selected_option !== null && activeRun?.selected_option !== undefined;
  const closed = activeRun?.status === 'closed';

  return (
    <ReactModal
      ariaHideApp={false}
      isOpen={!!activeRun}
      parentSelector={() => document.querySelector('#modals-container') || document.body}
      shouldCloseOnOverlayClick={answered || closed || isModerator}
      onRequestClose={() => {
        if (activeRun && (answered || closed || isModerator)) {
          // Ignore late polling/data-channel responses for a run the user has
          // already dismissed; otherwise they can immediately reopen the modal.
          dismissedRunIds.current.add(activeRun.id);
          setActiveRun(null);
        }
      }}
      style={modalStyle}
    >
      {activeRun && (
      <div style={{ color: '#172033', fontFamily: 'Inter, Arial, sans-serif' }}>
        <header style={{ padding: '24px 28px', background: 'linear-gradient(135deg, #132f63 0%, #2563b8 58%, #397bf6 100%)', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 900, letterSpacing: '0.12em', opacity: 0.82 }}>
                <span style={{ display: 'inline-flex', width: '24px', height: '24px', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: 'rgba(255,255,255,.16)' }}>✦</span>
                SYNAPSE QUIZ
              </div>
              <h2 style={{ margin: '9px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '24px', lineHeight: 1.2, fontWeight: 850 }}>{activeRun.quiz.title}</h2>
              <p style={{ margin: '7px 0 0', fontSize: '12px', opacity: 0.78 }}>{isModerator ? 'Màn hình giáo viên · Theo dõi kết quả trực tiếp' : 'Chọn một phương án và gửi trước khi hết giờ'}</p>
            </div>
            <div style={{ minWidth: '88px', flexShrink: 0, textAlign: 'center', border: '1px solid rgba(255,255,255,.2)', borderRadius: '18px', padding: '10px 12px', background: 'rgba(255,255,255,.13)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.12)' }}>
              <strong style={{ display: 'block', fontSize: '28px', lineHeight: 1, fontWeight: 900 }}>{activeRun.remaining_seconds}</strong>
              <span style={{ display: 'block', marginTop: '5px', fontSize: '10px', fontWeight: 800, opacity: 0.82 }}>GIÂY</span>
            </div>
          </div>
        </header>
        <main style={{ maxHeight: 'calc(100vh - 210px)', overflowY: 'auto', padding: '26px 28px 28px' }}>
          <p style={{ margin: '0', fontSize: '20px', fontWeight: 850, lineHeight: 1.45, color: '#13213a' }}>{activeRun.quiz.question}</p>
          {isModerator ? (
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', borderRadius: '14px', padding: '12px 14px', background: '#eef4ff', color: '#31527f' }}>
                <span style={{ fontSize: '12px', fontWeight: 750 }}>Tiến độ trả lời</span>
                <strong style={{ fontSize: '13px', color: '#184f9c' }}>{activeRun.response_count}/{activeRun.participant_count} học viên</strong>
              </div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {activeRun.quiz.options.map((option, index) => {
                  const count = activeRun.results?.option_counts[index] || 0;
                  const percent = activeRun.response_count ? Math.round((count / activeRun.response_count) * 100) : 0;
                  const correct = activeRun.results?.correct_option === index;
                  return (
                    <div key={`${index}-${option}`} style={{ overflow: 'hidden', border: `1px solid ${correct ? '#9dddbc' : '#dce4ef'}`, borderRadius: '15px', background: correct ? '#effbf4' : '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px' }}>
                        <span style={{ display: 'inline-flex', width: '32px', height: '32px', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '10px', background: correct ? '#1f9d68' : '#eef2f7', color: correct ? '#fff' : '#42526a', fontSize: '12px', fontWeight: 900 }}>{String.fromCharCode(65 + index)}</span>
                        <span style={{ minWidth: 0, flex: 1, fontSize: '14px', fontWeight: 750, color: '#243249' }}>{option}</span>
                        {correct && <span style={{ borderRadius: '999px', padding: '5px 9px', background: '#dff6e9', color: '#137a4e', fontSize: '10px', fontWeight: 850 }}>Đáp án đúng</span>}
                        <strong style={{ minWidth: '70px', textAlign: 'right', fontSize: '12px', color: correct ? '#137a4e' : '#516178' }}>{count} · {percent}%</strong>
                      </div>
                      <div style={{ height: '5px', background: '#edf1f6' }}><div style={{ width: `${percent}%`, height: '100%', borderRadius: '0 99px 99px 0', background: correct ? '#25a76d' : '#397bf6', transition: 'width .25s ease' }} /></div>
                    </div>
                  );
                })}
              </div>
              {!closed && <button type="button" onClick={() => void closeQuiz()} style={{ width: '100%', marginTop: '18px', border: 0, borderRadius: '14px', padding: '14px', background: '#e53d3d', color: '#fff', fontSize: '13px', fontWeight: 850, cursor: 'pointer', boxShadow: '0 8px 20px rgba(229,61,61,.2)' }}>Kết thúc và công bố đáp án</button>}
              {closed && <div style={{ marginTop: '18px', borderRadius: '14px', padding: '13px', textAlign: 'center', background: '#eaf8f1', color: '#178052', fontSize: '12px', fontWeight: 850 }}>Quiz đã kết thúc · Kết quả đã được công bố</div>}
            </div>
          ) : (
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                {activeRun.quiz.options.map((option, index) => {
                  const selected = selectedOption === index;
                  const correct = closed && activeRun.correct_option === index;
                  return (
                    <button key={`${index}-${option}`} type="button" disabled={answered || closed} onClick={() => setSelectedOption(index)} style={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: '62px', textAlign: 'left', border: `2px solid ${correct ? '#25a76d' : selected ? '#397bf6' : '#dce4ef'}`, borderRadius: '15px', padding: '12px 14px', background: correct ? '#eaf9f1' : selected ? '#eef5ff' : '#fff', color: '#273247', fontSize: '14px', fontWeight: 750, cursor: answered || closed ? 'default' : 'pointer', boxShadow: selected ? '0 8px 22px rgba(57,123,246,.12)' : 'none', transition: 'all .16s ease' }}>
                      <span style={{ display: 'inline-flex', width: '34px', height: '34px', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '11px', background: correct ? '#25a76d' : selected ? '#397bf6' : '#eef2f7', color: correct || selected ? '#fff' : '#536277', fontSize: '12px', fontWeight: 900 }}>{String.fromCharCode(65 + index)}</span>
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
              {!answered && !closed && <button type="button" disabled={selectedOption === null} onClick={() => void submitAnswer()} style={{ width: '100%', marginTop: '18px', border: 0, borderRadius: '14px', padding: '14px', background: selectedOption === null ? '#b9c3d0' : '#176dd2', color: '#fff', fontSize: '13px', fontWeight: 850, cursor: selectedOption === null ? 'not-allowed' : 'pointer', boxShadow: selectedOption === null ? 'none' : '0 8px 22px rgba(23,109,210,.22)' }}>Gửi đáp án</button>}
              {answered && !closed && <div style={{ marginTop: '18px', borderRadius: '14px', padding: '13px', textAlign: 'center', background: '#eaf8f1', color: '#19875c', fontSize: '12px', fontWeight: 850 }}>✓ Đã ghi nhận đáp án. Vui lòng chờ giáo viên công bố kết quả.</div>}
              {closed && <div style={{ marginTop: '18px', borderRadius: '14px', padding: '13px', textAlign: 'center', background: activeRun.selected_option === activeRun.correct_option ? '#eaf8f1' : '#fff0ef', color: activeRun.selected_option === activeRun.correct_option ? '#19875c' : '#c2413b', fontSize: '13px', fontWeight: 850 }}>{activeRun.selected_option === activeRun.correct_option ? '✓ Chính xác!' : 'Quiz đã kết thúc. Hãy xem đáp án đúng được đánh dấu phía trên.'}</div>}
            </div>
          )}
          {error && <p style={{ margin: '14px 0 0', borderRadius: '10px', padding: '10px 12px', background: '#fff0ef', color: '#c2413b', fontSize: '12px', fontWeight: 700 }}>{error}</p>}
        </main>
      </div>
      )}
    </ReactModal>
  );
}
