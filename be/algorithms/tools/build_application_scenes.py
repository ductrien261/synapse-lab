"""Refresh the sixteen authored application scenes without changing lesson content."""
import itertools
import json
import math
from pathlib import Path

SEED = Path(__file__).resolve().parents[1] / 'data/seeds/backtracking.json'


def step(title, description, route, state='try', phase=None):
    result = dict(title=title, description=description, route=route[:], state=state)
    if phase:
        result['phase'] = phase
    return result


def travel_steps(nodes, route, action):
    steps = [step('Chuẩn bị', f"Xuất phát từ {nodes[0]['label']}. Chọn tuyến rồi phát để xem hành trình.", [0], phase='move')]
    for n in range(1, len(route)-1):
        label = nodes[route[n]]['label']
        steps.append(step(f'Đi đến {label}', f"Di chuyển từ {nodes[route[n-1]]['label']} đến {label} theo tuyến đã chọn.", route[:n+1], phase='move'))
        steps.append(step(f'{action}: {label}', f'{action} tại {label}; đánh dấu hoàn thành đúng một lần trước khi đi tiếp.', route[:n+1], phase='act'))
    steps.append(step('Trở về điểm xuất phát', 'Đã xử lý đủ các điểm một lần và khép vòng về điểm xuất phát.', route, 'success', 'done'))
    return steps


def routes(scenario, labels, coordinates, action, metric, scale, unit):
    scenario['nodes'] = [dict(label=label, x=x, y=y) for label, (x, y) in zip(labels, coordinates)]
    scenario['tag'] = 'Hamilton · mở rộng tối ưu tuyến TSP'
    n = len(labels)
    scenario['edges'] = [[a,b] for a in range(n) for b in range(a+1,n)]
    def distance(route):
        total = 0
        for a,b in zip(route, route[1:]):
            dx,dy = abs(coordinates[a][0]-coordinates[b][0]),abs(coordinates[a][1]-coordinates[b][1])
            total += math.hypot(dx,dy) if metric == 'euclidean' else dx+dy
        return total*scale
    initial = list(range(n))+[0]
    best = min(([0,*p,0] for p in itertools.permutations(range(1,n))), key=distance)
    scenario['steps'] = travel_steps(scenario['nodes'], initial, action)
    scenario['scene']['distance'] = dict(metric=metric, scale=scale, unit=unit)
    scenario['scene']['alternatives'] = [dict(id='shortest', label='Tuyến ngắn nhất trong mô hình · TSP', steps=travel_steps(scenario['nodes'],best,action))]
    scenario['result'] = f"Tuyến theo thứ tự ban đầu dài {distance(initial):.1f} {unit}; tuyến ngắn nhất trong mô hình dài {distance(best):.1f} {unit}, giảm {distance(initial)-distance(best):.1f} {unit}."
    scenario['solution'] = f"Mỗi thứ tự ghé đủ điểm rồi trở về là một chu trình Hamilton. Để tối ưu, xét {math.factorial(n-1)} hoán vị của {n-1} điểm và chọn tổng quãng đường nhỏ nhất. Đây là phần mở rộng TSP; chỉ tìm Hamilton chưa đảm bảo ngắn nhất."


def queen_steps(nodes, noun, reverse=False):
    steps = [step('Bắt đầu bố trí', f'Chưa chọn {noun}; thử lần lượt từng hàng.', [])]
    size=4
    def search(route):
        row=len(route)
        if row==size:
            steps.append(step('Đủ bốn lựa chọn hợp lệ', f'Đã chọn đủ bốn {noun}, không trùng cột hoặc đường chéo trong mô hình.',route,'success'))
            return True
        for col in (range(3,-1,-1) if reverse else range(4)):
            if any(q%size==col or abs(q//size-row)==abs(q%size-col) for q in route):
                continue
            candidate=row*size+col
            selected=route+[candidate]
            steps.append(step(f'Chọn {nodes[candidate]["label"]}', f'Thử {noun} tại {nodes[candidate]["label"]}. Kiểm tra các ràng buộc với lựa chọn trước.',selected))
            if search(selected):
                return True
            steps.append(step('Gỡ lựa chọn vừa thử', f'Nhánh này không bố trí đủ bốn {noun}. Bỏ {nodes[candidate]["label"]} và thử vị trí khác.',route,'backtrack'))
        return False
    search([])
    return steps


def subset_steps(nodes, values, target, unit):
    steps=[step('Chưa chọn', f'Tổng 0; cần đúng {target} {unit}.', [])]
    solutions=[]
    def search(i, route, total):
        if total==target:
            solutions.append(route[:])
            steps.append(step('Khớp mục tiêu', f"{' + '.join(str(values[k]) for k in route)} = {target} {unit}.",route,'success'))
            return
        if total>target or i==len(values):
            return
        chosen=route+[i]
        new_total=total+values[i]
        steps.append(step(f'Chọn {nodes[i]["label"]}', f'Tổng = {new_total} {unit}.' + (' Vượt mục tiêu, loại nhánh này.' if new_total>target else f' Còn thiếu {target-new_total} {unit}.'),chosen,'backtrack' if new_total>target else 'try'))
        search(i+1,chosen,new_total)
        steps.append(step(f'Bỏ {nodes[i]["label"]}', f'Quay về tổng {total} {unit}; xét các lựa chọn còn lại.',route,'backtrack'))
        search(i+1,route,total)
    search(0,[],0)
    if solutions:
        steps.append(step('Giữ nhóm khớp mục tiêu',f'Tìm được {len(solutions)} nhóm có tổng đúng {target} {unit}. Hiển thị nhóm cuối.',solutions[-1],'success'))
    return steps


def build():
    payload=json.loads(SEED.read_text())
    scenes={s['scene']['theme']:s for a in payload['algorithms'] for s in a['content']['application_scenarios']}
    factory=scenes['factory']
    planning=[s for s in factory['steps'] if s.get('phase') in (None,'plan')]
    for s in planning:
        s['phase']='plan'
    factory['steps']=planning+travel_steps(factory['nodes'],planning[-1]['route'],'Kiểm tra trạm')
    factory['scene']['caption']='Xanh dương: thử tuyến · Cam: quay lui · Sau khi tìm được tuyến, robot thực hiện kiểm tra từng trạm.'
    factory['scene']['metricLabel']='Trạm trong tuyến / đã kiểm tra'

    circuit=scenes['circuit']
    routes(circuit,['Gốc máy','1','2','3','4','5','6'],[(10,76),(86,18),(22,78),(84,81),(24,18),(60,66),(57,16)],'Khoan lỗ','euclidean',1,'mm')
    circuit.update(title='Máy khoan bảng mạch điện tử',problem='Đầu khoan xử lý sáu lỗ trên bảng mạch, mỗi lỗ đúng một lần rồi về gốc máy. So sánh thứ tự đánh số với tuyến giảm quãng đường chạy không khoan.', model='Mỗi lỗ và gốc máy là một đỉnh. Đầu khoan nâng lên để đi thẳng giữa hai vị trí; cạnh có trọng số là khoảng cách Euclid.', limitations='Tọa độ là dữ liệu giả lập, đơn vị mm. Chưa xét gia tốc, thời gian khoan, thay mũi hay vật cản. Tối ưu quãng đường là TSP, không phải kết luận của Hamilton đơn thuần.')
    circuit['scene'].update(title='Bảng mạch · sáu vị trí cần khoan',metricLabel='Lỗ đã khoan',caption='Đường nét đứt: hành trình đầu máy · Vòng sáng: đang khoan · Lỗ xanh: đã xử lý.')
    town=scenes['town']
    routes(town,['Nhà','Siêu thị','Nhà thuốc','Bưu điện','Tiệm bánh','Tiệm giặt'],[(10,85),(90,15),(37,50),(10,15),(64,85),(90,50)],'Hoàn thành việc','manhattan',.05,'km')
    town.update(problem='Trước khi về nhà, bạn cần mua thực phẩm, lấy thuốc, gửi bưu phẩm, mua bánh và nhận đồ giặt. Chọn thứ tự ghé năm nơi để giảm việc đi vòng.', model='Mỗi điểm cần xử lý là một đỉnh; quãng đường giữa hai điểm là tổng độ lệch ngang và dọc trên mạng phố. Ghé mỗi nơi một lần rồi về nhà tạo chu trình Hamilton.',limitations='Khu phố giả lập: một đơn vị tọa độ tương ứng 0,05 km. Có thể đi lại trên đường đã qua; mỗi công việc chỉ xử lý một lần. Chưa xét giờ mở cửa, tắc đường hay đường một chiều.')
    town['scene'].update(title='Khu phố · chuyến đi của bạn',metricLabel='Việc đã hoàn thành',caption='Nhân vật đi theo đường phố; dừng tại từng cửa hàng để hoàn thành công việc.')
    delivery=scenes['delivery']
    routes(delivery,['Kho','Khách A','Khách B','Khách C','Khách D','Khách E'],[(10,85),(86,15),(10,15),(86,85),(48,50),(48,15)],'Giao kiện hàng','manhattan',.04,'km')
    delivery.update(problem='Xe chở năm đơn đến năm địa chỉ, bàn giao từng kiện rồi quay về kho. So sánh thứ tự đơn ban đầu với tuyến ngắn nhất trong mô hình.',model='Kho và năm khách là các đỉnh. Xe đi theo mạng đường ngang/dọc; khoảng cách là tổng độ lệch hai trục. Xử lý đủ đơn một lần rồi về kho tạo chu trình Hamilton.',limitations='Mạng đường giả lập hai chiều, một đơn vị bằng 0,04 km. Chưa xét tải xe, thời hạn giao, thời gian phục vụ hay giao thất bại; tối ưu quãng đường chỉ là một phần của bài toán vận tải.')
    delivery['scene'].update(title='Khu giao hàng · năm đơn trên xe',metricLabel='Đơn đã giao',caption='Xe chạy trên đường · Kiện được bàn giao tại địa chỉ · Mỗi khách nhận một đơn.')

    original=scenes['robot']['steps'][-1]['route']
    tour_info=[('robot','điểm kiểm tra','Robot quét điểm thử','Đèn trên sàn bật sau khi robot kiểm tra; chuyển động chữ L là luật của mô hình.'),('knight','ô cờ','Quân mã nhảy chữ L','Số trên ô là thứ tự ghé · Quân mã chỉ được ghé mỗi ô một lần.'),('terminal','trạng thái','Chạy ca kiểm thử','Màn hình hiển thị độ bao phủ; trạng thái chuyển xanh sau khi được kiểm thử.'),('flag','đảo','Chuyển mốc hành trình','Các đảo là vị trí bài tập; đường nối ghi lại thứ tự ghé theo bước chữ L.')]
    for variant,(theme,noun,action,caption) in enumerate(tour_info):
        scenario=scenes[theme]
        def transform(i):
            r,c=divmod(i,5)
            return [i,r*5+4-c,c*5+4-r,(4-r)*5+4-c][variant]
        route=[transform(i) for i in original]
        scenario['steps']=[step(f'{action} · {n+1}/25',f'Ghé {noun} {scenario["nodes"][i]["label"]}. '+('Điểm xuất phát của hành trình.' if not n else 'Chuyển lệch hai hàng, một cột hoặc một hàng, hai cột; vị trí chưa ghé.'),route[:n+1],'success' if n==24 else 'try') for n,i in enumerate(route)]
        scenario['scene'].update(caption=caption,metricLabel=f'Số {noun} đã ghé')
        if theme=='knight':
            scenario['problem']='Thiết kế màn chơi quân mã trên bàn 5×5: từ góc trên phải, chỉ đi chữ L và ghé đủ 25 ô, mỗi ô đúng một lần.'
    queen_info=[('sensor','cảm biến','Các vòng sóng thể hiện cảm biến; ô cam là vị trí bị loại theo ràng buộc giả định.'),('calendar','lịch nhiệm vụ','Thẻ việc được gán vào khung giờ; dấu × thể hiện lựa chọn xung đột.'),('tower','trạm đo','Trạm được dựng trên khu thử; đường đo và vùng cản tuân theo luật giả định.'),('queen','quân hậu','Thêm hoặc gỡ hậu · Ô màu cam bị khống chế · Tìm đủ bốn vị trí an toàn.')]
    for i,(theme,noun,caption) in enumerate(queen_info):
        scenario=scenes[theme]
        if theme=='calendar':
            for n,node in enumerate(scenario['nodes']): node['label']=f'Việc {n//4+1} / giờ {n%4+1}'
        scenario['steps']=queen_steps(scenario['nodes'],noun,reverse=bool(i%2))
        scenario['result']='Phương án cột ['+', '.join(str(n%4+1) for n in scenario['steps'][-1]['route'])+'] thỏa mãn các ràng buộc đã nêu.'
        scenario['scene'].update(caption=caption,metricLabel=f'Số {noun} đã bố trí')
    subset_info=[('coins',[2,3,5,7],10,'triệu',['Đèn','Ghế','Bàn','Máy chiếu'],'Chọn hạng mục đưa vào ví ngân sách; bỏ lựa chọn khi tổng vượt mục tiêu.'),('crate',[3,4,6,8],10,'kg',['Kiện A','Kiện B','Kiện C','Kiện D'],'Kiện hàng chuyển từ băng chuyền xuống bàn cân; số cân cập nhật theo nhóm đang xét.'),('clock',[15,20,25,35],60,'phút',['Đọc','Viết','Ôn tập','Thực hành'],'Các khối thời gian ghép thành phiên làm việc; chọn hoặc bỏ cả tác vụ.'),('receipt',[120,180,300,420],600,'nghìn',['Phiếu A','Phiếu B','Phiếu C','Phiếu D'],'Các phiếu chuyển từ sổ chờ sang nhóm đối chiếu; chỉ xác nhận khi tổng khớp.')]
    for theme,values,target,unit,labels,caption in subset_info:
        scenario=scenes[theme]
        for node,label in zip(scenario['nodes'],labels): node['label']=label
        scenario['scene'].update(values=values,target=target,unit=unit,caption=caption,metricLabel='Tổng đang chọn')
        scenario['problem']='Các lựa chọn: '+', '.join(f'{label} {value} {unit}' for label,value in zip(labels,values))+f'. Chọn một nhóm có tổng đúng {target} {unit}; mỗi lựa chọn dùng tối đa một lần.'
        scenario['model']=f'Mỗi đối tượng là một phần tử có trọng số; quyết định chọn/bỏ là 1/0. Tổng trọng số được chọn phải đúng {target} {unit}.'
        scenario['steps']=subset_steps(scenario['nodes'],values,target,unit)
        final=scenario['steps'][-1]['route']
        scenario['result']='Một nhóm hợp lệ: '+' + '.join(f'{labels[i]} ({values[i]})' for i in final)+f' = {target} {unit}.'
    SEED.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')


if __name__=='__main__':
    build()
