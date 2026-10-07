'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowRepeat, CheckCircleFill, XCircleFill } from 'react-bootstrap-icons';
import type { PartItem } from '../types';

// Archived model-specific demo content, kept for possible reuse.
export const CARDIAC_VEINS_DEMO_UID = 'faa6c5b169ec4928bda1f6bf36e0fcb6';
export const DEMO_SOURCE_URL = 'https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy';
export type DemoAction = 'quiz' | 'scenario' | 'summary' | 'flashcards' | 'answer';
export type ScenarioTopic = 'coronarySinus' | 'smallVein' | 'venousPath';
export type ScenarioStyle = 'clinic' | 'imaging';
export interface ScenarioOptions { topic: ScenarioTopic; style: ScenarioStyle }

export const SCENARIO_TOPICS: { value: ScenarioTopic; label: string }[] = [
  { value: 'coronarySinus', label: 'Xoang vành' },
  { value: 'smallVein', label: 'Tĩnh mạch tim nhỏ' },
  { value: 'venousPath', label: 'Đường máu tĩnh mạch tim' },
];

export function topicForPart(part: PartItem | null): ScenarioTopic {
  const name = selectedPartName(part);
  if (/xoang vành|coronary sinus/i.test(name)) return 'coronarySinus';
  if (/tĩnh mạch tim nhỏ|small cardiac vein/i.test(name)) return 'smallVein';
  return 'venousPath';
}

export function ScenarioSetup({ initialTopic, onCreate, onCancel }: {
  initialTopic: ScenarioTopic;
  onCreate: (options: ScenarioOptions) => void;
  onCancel: () => void;
}) {
  const [topic, setTopic] = useState<ScenarioTopic>(initialTopic);
  const [style, setStyle] = useState<ScenarioStyle>('clinic');
  return (
    <form onSubmit={(event) => { event.preventDefault(); onCreate({ topic, style }); }} className="mx-4 mb-3 rounded-2xl border border-[#C5D5EE] bg-[#F7F9FD] p-3 shadow-sm">
      <div className="mb-3 text-sm font-bold text-[#1E3F82]">Bạn muốn luyện tình huống nào?</div>
      <label className="mb-1 block text-xs font-semibold text-stone-600" htmlFor="scenario-topic">Chủ đề</label>
      <select id="scenario-topic" value={topic} onChange={(event) => setTopic(event.target.value as ScenarioTopic)} className="mb-3 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800">
        {SCENARIO_TOPICS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
      <fieldset>
        <legend className="mb-1 text-xs font-semibold text-stone-600">Kiểu tình huống</legend>
        <div className="grid grid-cols-2 gap-2">
          {([{ value: 'clinic', label: 'Ca khám bệnh' }, { value: 'imaging', label: 'Đọc hình ảnh tim' }] as const).map((item) => (
            <label key={item.value} className={`cursor-pointer rounded-lg border px-2 py-2 text-center text-xs font-semibold ${style === item.value ? 'border-[#1E3F82] bg-[#E8F0FB] text-[#1E3F82]' : 'border-stone-200 bg-white text-stone-600'}`}>
              <input type="radio" name="scenario-style" value={item.value} checked={style === item.value} onChange={() => setStyle(item.value)} className="sr-only" />
              {item.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600">Hủy</button>
        <button type="submit" className="rounded-lg bg-[#1E3F82] px-3 py-2 text-xs font-semibold text-white">Tạo tình huống</button>
      </div>
    </form>
  );
}

const QUIZ = {
  question: 'Xoang vành đổ máu trực tiếp vào buồng tim nào?',
  options: ['Tâm nhĩ phải', 'Tâm nhĩ trái', 'Tâm thất phải', 'Tâm thất trái'],
  correct: 0,
  explanation: 'Xoang vành nhận phần lớn máu tĩnh mạch từ cơ tim và đổ trực tiếp vào tâm nhĩ phải.',
};

const SCENARIO_CHOICES = {
  coronarySinus: {
    options: ['Tĩnh mạch chủ trên → tâm nhĩ phải', 'Xoang vành → tâm nhĩ phải', 'Xoang vành → tâm nhĩ trái', 'Động mạch vành phải → tâm thất phải'],
    correct: 1,
    explanation: 'Đây là xoang vành: mạch nhận phần lớn máu tĩnh mạch từ cơ tim rồi đổ vào tâm nhĩ phải. Cảm giác hồi hộp là lý do đi khám, không phải dấu hiệu để xác định mạch này.',
  },
  smallVein: {
    options: ['Tĩnh mạch tim lớn → dẫn lưu máu từ phần trên cơ thể', 'Động mạch vành phải → đưa máu về tâm nhĩ phải', 'Tĩnh mạch tim nhỏ → dẫn lưu máu từ một phần tim phải', 'Xoang vành → đưa máu từ phổi về tim'],
    correct: 2,
    explanation: 'Đây là tĩnh mạch tim nhỏ. Nó chạy gần động mạch vành phải và thu máu từ vùng tâm nhĩ phải, tâm thất phải; đường đổ về có thể khác nhau giữa các người.',
  },
  venousPath: {
    options: ['Cơ tim → động mạch chủ → tâm thất trái', 'Cơ tim → tĩnh mạch chủ trên → tâm nhĩ phải', 'Cơ tim → tĩnh mạch tim → xoang vành → tâm nhĩ phải', 'Cơ tim → tĩnh mạch phổi → tâm nhĩ trái'],
    correct: 2,
    explanation: 'Phần lớn máu tĩnh mạch từ cơ tim đi theo các tĩnh mạch tim vào xoang vành, rồi đổ vào tâm nhĩ phải. Một số tĩnh mạch tim trước đổ thẳng vào tâm nhĩ phải.',
  },
};

const FLASHCARDS = [
  { front: 'Các tĩnh mạch tim thu máu từ đâu?', back: 'Từ cơ tim; đây là máu trở về sau khi nuôi dưỡng chính mô tim.' },
  { front: 'Xoang vành nằm ở đâu?', back: 'Ở mặt sau tim, trong rãnh nhĩ thất.' },
  { front: 'Xoang vành đổ vào buồng tim nào?', back: 'Tâm nhĩ phải.' },
  { front: 'Tĩnh mạch tim lớn đi theo rãnh nào lúc đầu?', back: 'Rãnh gian thất trước, rồi đi theo rãnh vành về phía xoang vành.' },
  { front: 'Nhóm tĩnh mạch nào có thể đi thẳng vào tâm nhĩ phải, bỏ qua xoang vành?', back: 'Các tĩnh mạch tim trước.' },
];

const SCENARIOS: Record<ScenarioTopic, Record<ScenarioStyle, string>> = {
  coronarySinus: {
    clinic: '**Tình huống lâm sàng**\nAnh A, 48 tuổi, đến khám vì cảm giác hồi hộp. Khi xem hình ảnh tim, bác sĩ chỉ vào một mạch tĩnh mạch lớn ở mặt sau tim, nằm trong rãnh nhĩ thất. Nhiều tĩnh mạch nhỏ từ cơ tim cùng đổ về mạch này.\n\n**Câu hỏi:**\nMạch được chỉ là mạch nào? Máu qua mạch đó sẽ đi vào buồng tim nào?',
    imaging: '**Tình huống đọc hình ảnh**\nTrong buổi học đọc hình ảnh tim, giảng viên đánh dấu một mạch lớn ở mặt sau tim, chạy dọc rãnh giữa tâm nhĩ và tâm thất. Các tĩnh mạch trên bề mặt cơ tim hội tụ về đây.\n\n**Câu hỏi:**\nBạn sẽ ghi tên mạch này và buồng tim nhận máu từ nó là gì?',
  },
  smallVein: {
    clinic: '**Tình huống lâm sàng**\nChị B, 46 tuổi, đến khám vì hồi hộp. Khi xem hình ảnh tim, bác sĩ hướng dẫn sinh viên tìm một tĩnh mạch nhỏ ở phía tim phải, chạy gần động mạch vành phải và thu máu từ vùng tâm nhĩ phải, tâm thất phải.\n\n**Câu hỏi:**\nSinh viên cần chỉ mạch nào? Vai trò dẫn lưu của mạch đó là gì?',
    imaging: '**Tình huống đọc hình ảnh**\nTrên hình dựng 3D của tim, giảng viên đánh dấu một tĩnh mạch nhỏ chạy dọc phía tim phải, gần đường đi của động mạch vành phải.\n\n**Câu hỏi:**\nĐây là tĩnh mạch nào và nó thu máu chủ yếu từ vùng nào?',
  },
  venousPath: {
    clinic: '**Tình huống lâm sàng**\nAnh A, 48 tuổi, đến khám vì hồi hộp. Bác sĩ dùng hình ảnh tim để giải thích cho anh đường máu đã nuôi cơ tim quay trở lại tim: từ các mạch nhỏ trên bề mặt cơ tim, máu tập trung về một mạch lớn ở mặt sau tim.\n\n**Câu hỏi:**\nHãy chọn thứ tự đúng của đường dẫn lưu máu tĩnh mạch từ cơ tim về một buồng tim.',
    imaging: '**Tình huống đọc hình ảnh**\nTrên hình dựng 3D, bạn lần theo các tĩnh mạch trên bề mặt tim. Phần lớn các mạch này hội tụ về xoang vành ở mặt sau tim.\n\n**Câu hỏi:**\nHãy chọn đúng thứ tự dòng máu từ cơ tim đến buồng tim nhận máu.',
  },
};

function selectedPartName(part: PartItem | null): string {
  return part?.structure?.name_vi || part?.label || '';
}

export function demoContent(action: DemoAction, part: PartItem | null, question = '', scenario?: ScenarioOptions): string {
  const name = selectedPartName(part);
  const coronarySinus = /xoang vành|coronary sinus/i.test(name);
  const smallVein = /tĩnh mạch tim nhỏ|small cardiac vein/i.test(name);

  if (action === 'scenario') {
    const chosen = scenario ?? { topic: topicForPart(part), style: 'clinic' };
    return SCENARIOS[chosen.topic][chosen.style];
  }

  if (action === 'summary') {
    return '**Tóm tắt hệ tĩnh mạch tim**\n- Các tĩnh mạch tim dẫn máu từ cơ tim trở về tim, thường chạy gần các động mạch trên bề mặt tim.\n- Tĩnh mạch tim lớn bắt đầu dọc rãnh gian thất trước, sau đó đi trong rãnh vành về xoang vành.\n- Tĩnh mạch tim giữa đi theo rãnh gian thất sau; tĩnh mạch tim nhỏ đi gần động mạch vành phải.\n- Xoang vành nằm ở mặt sau tim, trong rãnh nhĩ thất, và đổ vào tâm nhĩ phải.\n- Riêng các tĩnh mạch tim trước có thể đổ thẳng vào tâm nhĩ phải, không qua xoang vành.';
  }

  if (action === 'quiz') return 'Chọn một đáp án để tự kiểm tra đường dẫn lưu của xoang vành.';
  if (action === 'flashcards') return 'Lật từng thẻ để ôn nhanh các mạch trong hệ tĩnh mạch tim.';

  if (/bệnh|tổn thương|điều trị|chẩn đoán/i.test(question)) {
    return 'Nội dung ở đây tập trung vào cấu trúc và đường dẫn lưu tĩnh mạch tim. Với câu hỏi về bệnh lý, hãy xem thêm mục Thông tin và nguồn giáo trình để có căn cứ phù hợp.';
  }
  if (coronarySinus) {
    return '**Xoang vành** là mạch tĩnh mạch lớn ở mặt sau tim, nằm trong rãnh nhĩ thất. Nó nhận phần lớn máu từ các tĩnh mạch cơ tim và đổ trực tiếp vào tâm nhĩ phải. Hãy lần theo mạch màu xanh trên mô hình để thấy vị trí của nó.';
  }
  if (smallVein) {
    return '**Tĩnh mạch tim nhỏ** đi gần động mạch vành phải và thu máu từ mặt sau tâm nhĩ phải, tâm thất phải. Đường đổ về của mạch này có thể khác nhau; hãy đối chiếu với nhãn trên mô hình 3D.';
  }
  return '**Hệ tĩnh mạch tim** thu máu từ cơ tim. Phần lớn dòng máu này đi qua xoang vành ở mặt sau tim rồi về tâm nhĩ phải. Trên mô hình, bạn có thể chọn từng mạch để xem đường đi cụ thể.';
}

export function DemoExtras({ action, part, scenario }: { action: DemoAction; part: PartItem | null; scenario?: ScenarioOptions }) {
  if (action === 'quiz') return <DemoQuiz />;
  if (action === 'scenario') return <DemoScenario topic={scenario?.topic ?? topicForPart(part)} />;
  if (action === 'flashcards') return <DemoFlashcards />;
  return null;
}

function DemoScenario({ topic }: { topic: ScenarioTopic }) {
  const [selected, setSelected] = useState<number | null>(null);
  const choices = SCENARIO_CHOICES[topic];
  return (
    <div className="rounded-xl border border-[#C5D5EE] bg-[#F7F9FD] p-3 flex flex-col gap-2">
      <div className="text-xs font-bold text-[#1E3F82]">Chọn đáp án</div>
      {choices.options.map((option, index) => (
        <button
          key={option}
          type="button"
          disabled={selected !== null}
          onClick={() => setSelected(index)}
          className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${selected !== null && index === choices.correct ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : selected === index ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-stone-200 bg-white text-stone-700 hover:border-[#1E3F82]/40 disabled:cursor-default'}`}
        >
          <span className="mr-1.5 font-bold">{String.fromCharCode(65 + index)}.</span>{option}
        </button>
      ))}
      {selected !== null && (
        <div className={`rounded-lg px-3 py-2 text-sm ${selected === choices.correct ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
          <div className="mb-1 flex items-center gap-1.5 font-bold">
            {selected === choices.correct ? <CheckCircleFill className="h-4 w-4" /> : <XCircleFill className="h-4 w-4" />}
            {selected === choices.correct ? 'Chính xác!' : 'Chưa đúng, xem lại nhé'}
          </div>
          {choices.explanation}
          <button type="button" onClick={() => setSelected(null)} className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#1E3F82] hover:underline">
            <ArrowRepeat className="h-3 w-3" /> Chọn lại
          </button>
        </div>
      )}
    </div>
  );
}

function DemoQuiz() {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div className="rounded-xl border border-[#C5D5EE] bg-[#F7F9FD] p-3 flex flex-col gap-2">
      <p className="text-sm font-semibold text-stone-800">{QUIZ.question}</p>
      <div className="flex flex-col gap-1.5">
        {QUIZ.options.map((option, index) => (
          <button
            key={option}
            type="button"
            disabled={selected !== null}
            onClick={() => setSelected(index)}
            className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${selected !== null && index === QUIZ.correct ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : selected === index ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-stone-200 bg-white text-stone-700 hover:border-[#1E3F82]/40 disabled:cursor-default'}`}
          >
            <span className="mr-1.5 font-bold">{String.fromCharCode(65 + index)}.</span>{option}
          </button>
        ))}
      </div>
      {selected !== null && (
        <div className={`rounded-lg px-3 py-2 text-sm ${selected === QUIZ.correct ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
          <div className="mb-1 flex items-center gap-1.5 font-bold">
            {selected === QUIZ.correct ? <CheckCircleFill className="h-4 w-4" /> : <XCircleFill className="h-4 w-4" />}
            {selected === QUIZ.correct ? 'Chính xác!' : 'Chưa đúng, xem lại nhé'}
          </div>
          {QUIZ.explanation}
          <button type="button" onClick={() => setSelected(null)} className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#1E3F82] hover:underline">
            <ArrowRepeat className="h-3 w-3" /> Làm lại
          </button>
        </div>
      )}
    </div>
  );
}

function DemoFlashcards() {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = FLASHCARDS[index];
  const move = (delta: number) => {
    setIndex((current) => (current + delta + FLASHCARDS.length) % FLASHCARDS.length);
    setFlipped(false);
  };
  return (
    <div className="rounded-xl border border-[#C5D5EE] bg-[#F7F9FD] p-3">
      <div className="mb-2 text-xs font-bold text-[#1E3F82]">Flashcard {index + 1}/{FLASHCARDS.length}</div>
      <button type="button" onClick={() => setFlipped((value) => !value)} className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-4 text-center hover:border-[#1E3F82]/40">
        <span className="text-[11px] font-bold uppercase tracking-wide text-stone-400">{flipped ? 'Mặt sau' : 'Mặt trước'}</span>
        <span className="text-sm font-semibold text-stone-800">{flipped ? card.back : card.front}</span>
        <span className="text-xs text-[#1E3F82]">Nhấn để lật thẻ</span>
      </button>
      <div className="mt-2 flex justify-between">
        <button type="button" onClick={() => move(-1)} className="flex items-center gap-1 text-xs font-semibold text-[#1E3F82]"><ArrowLeft /> Trước</button>
        <button type="button" onClick={() => move(1)} className="flex items-center gap-1 text-xs font-semibold text-[#1E3F82]">Tiếp <ArrowRight /></button>
      </div>
    </div>
  );
}
