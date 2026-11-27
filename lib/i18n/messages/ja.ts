/**
 * 画面の文言 (日本語・原文)。
 * {name} の部分は表示時に値が入る。他の言語ファイルはこれと同じキーをすべて持つ。
 */
const ja = {
  // 共通
  "app.title": "キズナテック カレンダー",
  "common.loading": "読み込み中…",
  "common.close": "閉じる",
  "common.cancel": "キャンセル",
  "common.save": "保存",
  "common.delete": "削除",
  "common.ok": "OK",
  "common.add": "＋ 追加",
  "common.today": "今日",
  "common.allDay": "終日",
  "common.noEvents": "予定はありません",
  "common.searching": "検索中…",

  // カレンダー
  "calendar.shared": "共通カレンダー",
  "calendar.personal": "個人カレンダー",
  "calendar.sharedShort": "共通",
  "calendar.personalShort": "個人",
  "calendar.switcherLabel": "表示するカレンダー",
  "calendar.sharedDesc":
    "みんなで共有する予定です。追加・変更は全員に表示されます。",
  "calendar.personalDesc":
    "自分だけの予定と、時間割の授業です。予定はこのブラウザに保存されます。",
  "calendar.prevMonth": "前の月",
  "calendar.nextMonth": "次の月",
  "calendar.dayAria": "{date}、予定{n}件",
  "calendar.more": "他{n}件",
  "calendar.hintDoubleClick": "日付をダブルクリックでも予定を追加できます。",
  "calendar.hintTimetable":
    "時間割はメニューの「時間割」から作成・表示できます。",
  "calendar.notifyOn": "通知あり",
  "calendar.timetableLabel": "時間割：{title}",

  // メニュー
  "menu.open": "メニューを開く",
  "menu.close": "メニューを閉じる",
  "menu.title": "メニュー",
  "menu.calendars": "カレンダー",
  "menu.view": "表示",
  "menu.todaySchedule": "本日の予定",
  "menu.goToday": "今日の日付に移動",
  "menu.timetable": "時間割",
  "menu.timetableManage": "時間割の作成・検索",
  "menu.settings": "設定",
  "menu.language": "言語",
  "menu.logout": "ログアウト",
  "menu.logoutConfirm": "ログアウトしますか？",

  // 予定の追加・編集
  "event.addTitle": "予定を追加",
  "event.editTitle": "予定を編集",
  "event.title": "タイトル",
  "event.titlePlaceholder": "例：打ち合わせ",
  "event.date": "日付",
  "event.startTime": "開始時刻",
  "event.endTime": "終了時刻",
  "event.color": "色",
  "event.memo": "メモ",
  "event.notify": "通知",
  "event.notifyAllDay":
    "終日の予定には通知を設定できません（開始時刻を決めると設定できます）。",
  "event.notifyEnable": "通知する",
  "event.notifyWhen": "何分前に通知するか",
  "event.notifyUnsupported":
    "このブラウザは通知に対応していないため、画面内のお知らせだけ表示します。",
  "event.notifyDenied":
    "ブラウザの通知が許可されていないため、画面内のお知らせだけ表示します。ブラウザの設定から通知を許可できます。",
  "event.notifyNote":
    "※ このアプリを開いている間（別のタブを見ていても可）に通知します。",
  "event.notifyNoteShared":
    "共通カレンダーの予定は、アプリを開いている全員に通知されます。",
  "event.deleteConfirm": "「{title}」を削除しますか？",

  // 通知のタイミング・お知らせ
  "notify.minutes": "{n}分前",
  "notify.hours": "{n}時間前",
  "notify.days": "{n}日前",
  "reminder.inMinutes": "{n}分後",
  "reminder.inHours": "{h}時間後",
  "reminder.inHoursMinutes": "{h}時間{m}分後",
  "reminder.title": "{left}：{title}",
  "reminder.body": "{time} 開始",
  "reminder.dismiss": "お知らせを閉じる",

  // 色
  "color.blue": "青",
  "color.green": "緑",
  "color.red": "赤",
  "color.amber": "黄",
  "color.purple": "紫",

  // 本日の予定
  "today.title": "本日の予定",
  "today.count": "{n}件",
  "today.timetable": "時間割",
  "today.noClasses": "今日の授業はありません",

  // 予定の検索
  "search.label": "予定を検索",
  "search.placeholder": "予定を検索（タイトル・メモ）",
  "search.noResults": "「{q}」に一致する予定はありません",
  "search.results": "検索結果",
  "search.more": "ほか{n}件。キーワードを増やして絞り込んでください。",

  // ログイン
  "login.tabLogin": "ログイン",
  "login.tabRegister": "新規登録（初めての方）",
  "login.name": "名前",
  "login.namePlaceholder": "例：山田 太郎",
  "login.studentId": "学籍番号",
  "login.studentIdAria": "学籍番号（{prefix}の後ろの番号）",
  "login.studentIdNote":
    "※ 学籍番号の先頭の「{prefix}」は入力済みです。{prefix}の後ろの番号だけを半角数字で入力してください。（例：M1234567 → 1234567）",
  "login.submitRegister": "登録してはじめる",
  "login.submitLogin": "ログイン",
  "login.hintRegister": "2回目以降は学籍番号だけでログインできます。",
  "login.hintLogin":
    "初めての方は「新規登録」から名前と学籍番号を登録してください。",
  "login.back": "ログインせずに共通カレンダーを見る",
  "guest.notice":
    "ログインすると、予定の追加・編集や個人カレンダー、時間割が使えます。",

  // 時間割の一覧・検索
  "tt.title": "時間割",
  "tt.editTitle": "時間割を編集",
  "tt.newTitle": "新しい時間割",
  "tt.tabMine": "自分の時間割",
  "tt.tabSearch": "時間割を探す",
  "tt.ownedHeading": "自分が作った時間割",
  "tt.newButton": "＋ 新しい時間割",
  "tt.noneOwned": "まだ時間割がありません。「＋ 新しい時間割」から作成できます。",
  "tt.edit": "編集",
  "tt.subscribedHeading": "表示中の他の人の時間割",
  "tt.noneSubscribed": "「時間割を探す」から他の人の時間割を表示できます。",
  "tt.searchLabel": "時間割を検索",
  "tt.searchPlaceholder": "時間割の名前・作成者・科目名で検索",
  "tt.searchIntro": "キーワードを入力すると、みんなが作った時間割を探せます。",
  "tt.searchNoResults": "「{q}」に一致する時間割はありません",
  "tt.ownAlwaysShown": "自分の時間割（常に表示）",
  "tt.cardMeta": "作成：{owner}・{start}〜{end}・{n}コマ",
  "tt.showContents": "中身を見る",
  "tt.subscribe": "自分のカレンダーに表示",
  "tt.unsubscribe": "表示をやめる",
  "tt.deleteConfirm":
    "「{title}」を削除しますか？\n表示している他の人のカレンダーからも消えます。",

  // 時間割の作成・編集
  "tte.name": "時間割の名前（検索でこの名前がヒットします）",
  "tte.namePlaceholder": "例：情報工学科 2年 前期",
  "tte.term": "期間",
  "tte.startDate": "開始日",
  "tte.endDate": "終了日",
  "tte.periodsHeading": "時限と時刻",
  "tte.period": "{n}限",
  "tte.periodStart": "{n}限の開始時刻",
  "tte.periodEnd": "{n}限の終了時刻",
  "tte.addPeriod": "＋ 時限を追加",
  "tte.removePeriod": "− 最後の時限を削除",
  "tte.classesHeading": "授業（マスをクリックして入力）",
  "tte.create": "作成",
  "tte.cell": "{day} {period}：{subject}",
  "tte.cellEmpty": "{day} {period}（空き）",
  "tte.slotHeading": "{day} {period}",
  "tte.subject": "科目名",
  "tte.subjectPlaceholder": "科目名（例：線形代数）",
  "tte.room": "教室",
  "tte.roomPlaceholder": "教室（任意）",
  "tte.memoPlaceholder": "メモ（任意）",
  "tte.clearSlot": "このコマを空にする",

  // 言語の選択
  "lang.title": "言語を選択",
  "lang.intro":
    "表示する言語を選んでください。あとからメニューの「言語」で変更できます。",
  "lang.searchPlaceholder": "言語を検索（例：English, 中文, 한국어）",
  "lang.noResults": "一致する言語がありません",

  // エラー
  "err.generic": "エラーが発生しました",
  "err.unauthorized": "ログインしてください",
  "err.invalid": "内容が不正です",
  "err.server": "サーバーエラーが発生しました",
  "err.studentIdTaken":
    "この学籍番号はすでに登録されています。「ログイン」から入ってください。",
  "err.studentIdNotFound":
    "この学籍番号は登録されていません。初めての方は「新規登録」から登録してください。",
  "err.forbidden": "この時間割を編集できるのは作成者だけです",
  "err.notFound": "時間割が見つかりません",
  "err.sharedLoad":
    "共通カレンダーを読み込めませんでした。通信状況を確認してください。",
  "err.timetablesLoad": "時間割を読み込めませんでした",
  "err.saveFailed": "保存できませんでした",
  "err.deleteFailed": "削除できませんでした",
  "err.changeFailed": "変更できませんでした",
  "err.searchFailed": "検索できませんでした",
  "err.studentIdRequired": "学籍番号を入力してください",
  "err.studentIdFullWidth": "数字は半角で入力してください（全角は使えません）",
  "err.studentIdDigits": "{prefix} の後ろの番号を半角数字だけで入力してください",
  "err.studentIdTooLong": "番号が長すぎます",
  "err.studentIdPrefix": "学籍番号は {prefix} から始まる必要があります",
  "err.nameRequired": "名前を入力してください",
  "err.nameTooLong": "名前は50文字以内で入力してください",
  "err.eventTitleRequired": "タイトルを入力してください",
  "err.eventEndBeforeStart": "終了時刻は開始時刻より後にしてください",
  "err.ttTitleRequired": "時間割の名前を入力してください",
  "err.ttDatesRequired": "期間を入力してください",
  "err.ttEndBeforeStart": "期間の終了日は開始日より後にしてください",
  "err.ttNoPeriods": "時限を1つ以上設定してください",
  "err.ttTooManyPeriods": "時限は{n}個までです",
  "err.ttPeriodTime": "{n}限の時刻を入力してください",
  "err.ttPeriodEndBeforeStart": "{n}限の終了時刻は開始時刻より後にしてください",
  "err.subjectRequired": "科目名を入力してください",
} as const;

export type MessageKey = keyof typeof ja;
export type Messages = Record<MessageKey, string>;

export default ja satisfies Messages;
