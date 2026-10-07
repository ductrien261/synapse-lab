"""Regenerate bounded teaching traces for the two newly completed seed lessons."""
import json
from pathlib import Path

SEED = Path(__file__).resolve().parents[1] / 'data/seeds/backtracking.json'


def frame(line, message, panels, values, tone='selected'):
    return dict(codeLine=line, message=message, action=dict(label=message, tone=tone),
                panels=panels, context=dict(title='Trạng thái quay lui', values=values), metrics=values)


def queens(n):
    cols = [-1] * n
    steps = []

    def emit(line, message, row, candidate=-1, tone='selected'):
        cells = [[dict(value='H' if cols[r] == c else '·', tone='complete' if cols[r] == c else tone if (r,c)==(row,candidate) else 'idle') for c in range(n)] for r in range(n)]
        steps.append(frame(line, message, [dict(id='board', kind='matrix', title=f'Bàn {n}×{n} · H = hậu', cells=cells)], [dict(label='Hàng đang xét', value=str(row+1)), dict(label='Đã đặt', value=str(sum(c>=0 for c in cols)))], tone))

    def solve(row):
        if row == n:
            emit(13,'Đã đặt đủ hậu; giữ lại lời giải.', row, tone='complete')
            return True
        for c in range(n):
            emit(15,f'Thử hàng {row+1}, cột {c+1}.',row,c,'active')
            if any(cols[r]==c or abs(r-row)==abs(cols[r]-c) for r in range(row)):
                emit(9,'Vị trí bị chặn bởi một hậu trước đó.',row,c,'rejected')
                continue
            cols[row]=c
            emit(16,'Vị trí hợp lệ, đặt hậu và xét hàng tiếp theo.',row)
            if solve(row+1):return True
            cols[row]=-1
            emit(18,'Nhánh thất bại: gỡ hậu để thử cột khác.',row,c,'rejected')
        return False
    emit(24,'Khởi tạo các hàng chưa có hậu.',0)
    found=solve(0)
    if not found:emit(25,'Đã thử hết các nhánh: không có nghiệm.',0,tone='rejected')
    return steps, 'Đã tìm được một cách đặt hậu hợp lệ.' if found else 'Không có cách đặt hậu hợp lệ cho bàn này.'


def subsets(a, target):
    steps=[];chosen=[];solutions=[]
    def emit(line,message,i,total,tone='selected'):
        cells=[[dict(value=str(v),tone='complete' if j in chosen else 'active' if j==i else 'idle') for j,v in enumerate(a)]]
        steps.append(frame(line,message,[dict(id='values',kind='array',title='Phần tử xanh đã chọn',cells=cells)], [dict(label='Tổng',value=str(total)),dict(label='Mục tiêu',value=str(target)),dict(label='Chỉ số đã chọn',value=', '.join(str(j+1) for j in chosen) or '∅')],tone))
    def search(i,total):
        if total==target:
            solutions.append(list(chosen));emit(12,'Ghi nhận một nghiệm; tiếp tục tìm các nhánh khác.',i,total,'complete');return
        if i==len(a) or total>target or total+sum(a[i:])<target:
            emit(17,'Nhánh không thể đạt mục tiêu: dừng và quay lui.',i,total,'rejected');return
        chosen.append(i);emit(18,f'Chọn phần tử {a[i]}.',i,total+a[i]);search(i+1,total+a[i])
        chosen.pop();emit(20,f'Bỏ lựa chọn {a[i]}, phục hồi tổng.',i,total,'rejected');search(i+1,total)
    emit(28,'Bắt đầu với tập rỗng.',0,0);search(0,0)
    summary=f'Tìm được {len(solutions)} nghiệm theo chỉ số: '+('; '.join('['+', '.join(str(j+1) for j in sol)+']' for sol in solutions) or 'không có nghiệm')+'.'
    emit(28,summary,len(a),0,'complete' if solutions else 'rejected')
    return steps,summary


def main():
    payload=json.loads(SEED.read_text())
    for row in payload['algorithms']:
        key=row['key'];content=row['content']
        if key not in ('n-queens-problem','sum-of-subsets'):continue
        definitions=[('four','N=4 · có nghiệm',queens(4)),('three','N=3 · vô nghiệm',queens(3)),('one','N=1 · trường hợp nhỏ nhất',queens(1))] if key=='n-queens-problem' else [('ten','[2,3,5,7] · mục tiêu 10',subsets([2,3,5,7],10)),('none','[2,4] · mục tiêu 3',subsets([2,4],3)),('zero','[2,4] · mục tiêu 0',subsets([2,4],0))]
        config=dict(renderer='matrix',title=content['lesson_fields']['title'],samples=[dict(key=k,label=label) for k,label,_ in definitions])
        samples={k:dict(renderer='matrix',code=dict(language='cpp',source=content['code_lesson']['source']),steps=steps,summary=summary) for k,_,(steps,summary) in definitions}
        content['simulation']=dict(version=1,algorithm_path='backtracking/'+key,config=config,samples=samples)
        content['time_best']='Phụ thuộc đầu vào; xem phân tích trong bài.'
    SEED.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')


if __name__ == '__main__':
    main()
