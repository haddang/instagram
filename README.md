# 인스타그램 DM 아카이브 뷰어 (Instagram DM Viewer)

이 폴더에 저장된 **이재인 님과의 301,537개 인스타그램 DM 대화 내역**(2024년 11월 ~ 2026년 10월)을 실제 인스타그램 앱과 동일한 화면으로 편리하게 스크롤하며 볼 수 있는 고성능 웹 뷰어입니다.

---

## 🚀 실행 방법

### 방법 1 (가장 간단): 더블 클릭
1. 폴더 안에 있는 [`index.html`](file:///Users/parkhawon/Downloads/your_instagram_activity/messages/inbox/ijaein_919720559421295/index.html) 파일을 더블 클릭하여 브라우저(Safari, Chrome 등)에서 바로 엽니다.
2. 또는 터미널에서 아래 명령어로 즉시 열 수 있습니다:
   ```bash
   open index.html
   ```

### 방법 2: 로컬 서버로 실행 (선택 사항)
동영상이나 고해상도 미디어를 보다 쾌적하게 재생하려면:
```bash
python3 -m http.server 8080
```
실행 후 브라우저에서 `http://localhost:8080` 으로 접속하시면 됩니다.

---

## ✨ 주요 기능 및 특징

1. **완벽한 한글 및 이모지 복원**:
   - 인스타그램 데이터 내보내기 특유의 UTF-8 / Latin-1 인코딩 오류(외계어 깨짐 현상)를 100% 정상 한글 및 이모지로 디코딩 처리했습니다.
2. **30만 개 이상의 초대용량 대화 초고속 가상 윈도우 스크롤 (Virtual Windowing)**:
   - 301,537개의 대화와 6,500여 개의 사진/동영상을 메모리 과부하 없이 60fps로 매끄럽게 무한 스크롤할 수 있습니다.
3. **인스타그램 시그니처 감성 디자인**:
   - 올블랙 다크 모드 & 라이트 모드 전환 (🌓)
   - 모바일 아이폰 프레임 뷰 (Dynamic Island 탑재) vs 데스크톱 와이드 뷰 전환 (📱)
   - 상대방 연속 메시지 그룹화 및 인스타 시그니처 퍼플 그라데이션 말풍선
   - 하트 등 반응(Reactions) 뱃지 표시
   - 음성 메시지(Waveform 플레이어) 및 통화 기록(영상/음성 통화 시간) 표시
4. **키워드 실시간 검색 (🔍)**:
   - 30만 개 메시지 속에서 원하는 단어를 즉시 검색하고 이전/다음 결과로 부드럽게 점프(Highlight 효과)합니다.
5. **날짜 점프 캘린더 (📅)**:
   - 2024년 11월부터 2026년 10월까지 원하는 연/월 또는 특정 날짜를 클릭 한 번으로 바로 이동합니다.
6. **공유 미디어 갤러리 (🖼️)**:
   - 대화 중 주고받은 **6,100장의 사진과 419개의 동영상**을 갤러리 그리드에서 한눈에 모아보고, 클릭 시 해당 대화 시점으로 즉시 이동할 수 있습니다.
7. **개인화 설정 (⚙️)**:
   - **내 시점 변경**: 박하원 ↔ 이재인 시점 전환
   - **상대방 프로필 사진 커스텀 등록**
   - **말풍선 테마 변경**: 퍼플 그라데이션, 클래식 인스타 그라데이션, 오션 블루, 선셋 오렌지

---

## 📁 주요 파일 구성
- [`index.html`](file:///Users/parkhawon/Downloads/your_instagram_activity/messages/inbox/ijaein_919720559421295/index.html): 인스타그램 DM 메인 뷰어 파일
- [`style.css`](file:///Users/parkhawon/Downloads/your_instagram_activity/messages/inbox/ijaein_919720559421295/style.css): 인스타그램 DM UI 스타일시트
- [`app.js`](file:///Users/parkhawon/Downloads/your_instagram_activity/messages/inbox/ijaein_919720559421295/app.js): 가상 스크롤, 검색, 갤러리, 날짜 점프 인터랙션 스크립트
- [`chat_data.js`](file:///Users/parkhawon/Downloads/your_instagram_activity/messages/inbox/ijaein_919720559421295/chat_data.js): 31개 JSON 파일에서 디코딩 및 최적화된 전체 대화 데이터
- [`build_viewer.py`](file:///Users/parkhawon/Downloads/your_instagram_activity/messages/inbox/ijaein_919720559421295/build_viewer.py): 향후 새로운 JSON 대화가 추가되었을 때 데이터를 다시 빌드할 수 있는 스크립트
