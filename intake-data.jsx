/* ============================================================
   lotabin — Intake flow data + bilingual copy
   Exposes window.INTAKE = { t, plans, tones, formats, timings, regions }
   Japanese rewritten to read naturally (less literal than site dict).
   ============================================================ */

(function () {
  // ---- UI string dictionary (EN / JA) ----
  const DICT = {
    en: {
      'brand.kicker': 'Production desk',
      'brand.sub': 'New brief',
      'close': 'Close',
      'resume.note': 'Draft restored',
      'reset': 'Start over',

      'step.lane': 'Who is this for',
      'step.plan': 'Scope',
      'step.offer': 'The offer',
      'step.creative': 'Direction',
      'step.assets': 'Assets & timing',
      'step.contact': 'Your details',
      'step.review': 'Review',

      'nav.back': 'Back',
      'nav.next': 'Continue',
      'nav.submit': 'Open the brief',
      'nav.step': 'Step',
      'nav.of': 'of',

      // Lane step
      'lane.h': 'Let’s open a brief.',
      'lane.p': 'Two ways to work with the desk. Pick the one that fits — you can change it later.',
      'lane.brand.t': 'Brand or business',
      'lane.brand.d': 'You sell your own product or service and want a repeatable video-ad engine.',
      'lane.agency.t': 'Agency or media buyer',
      'lane.agency.d': 'You own the client and the strategy. We supply white-label video.',
      'lane.tagline.brand': 'For founders & in-house teams',
      'lane.tagline.agency': 'White-label / co-branded',

      // Plan step
      'plan.h': 'Pick a starting scope.',
      'plan.p': 'Not locked in — it sets a starting point and an estimate. We confirm scope before anything is produced.',
      'plan.unsure.t': 'Help me choose',
      'plan.unsure.d': 'Not sure yet? We’ll recommend a scope from your offer.',
      'plan.popular': 'Most chosen',
      'plan.from': 'from',

      // Offer step
      'offer.h': 'Tell us what we’re selling.',
      'offer.p': 'The offer drives everything — we start here, not with visuals.',
      'offer.product.l': 'Product or service name',
      'offer.product.ph': 'e.g. Aoba Cold Brew — subscription',
      'offer.what.l': 'What is it, in one or two lines?',
      'offer.what.ph': 'What you sell, and what makes it worth buying.',
      'offer.who.l': 'Who is it for?',
      'offer.who.ph': 'The buyer. Age, role, what they care about.',
      'offer.pain.l': 'What problem does it solve?',
      'offer.pain.ph': 'The pain, the hesitation, the “before” state.',
      'offer.cta.l': 'What should the viewer do next?',
      'offer.cta.ph': 'Buy now · Start a trial · Book a call · Visit site',

      // Creative step
      'creative.h': 'Set the direction.',
      'creative.p': 'A starting feel and a few choices. We turn this into a concrete creative direction before production.',
      'creative.tone.l': 'Tone — pick up to three',
      'creative.hooks.l': 'Hook options per pack',
      'creative.formats.l': 'Delivery formats',
      'creative.refs.l': 'Reference links (optional)',
      'creative.refs.ph': 'Paste ad links, competitors, a moodboard, anything you like.',

      // Assets step
      'assets.h': 'Assets & timing.',
      'assets.p': 'What you can hand over, and when you’d like the first wave.',
      'assets.ready.l': 'What do you already have?',
      'assets.footage': 'Raw footage / clips',
      'assets.product': 'Product shots / photos',
      'assets.logo': 'Logo & brand kit',
      'assets.none': 'Nothing yet — start from scratch',
      'assets.drop.l': 'Drop a brief, deck, or brand file',
      'assets.drop.ph': 'Drag a file here, or click to browse',
      'assets.drop.note': 'PDF, deck, or a folder link — optional',
      'assets.timing.l': 'When do you want the first wave?',
      'assets.notes.l': 'Brand notes (optional)',
      'assets.notes.ph': 'Voice, words to avoid, must-include claims, legal lines…',

      // Contact step
      'contact.h': 'Where do we send it?',
      'contact.p': 'We reply with a confirmed scope and the first direction within one business day.',
      'contact.name.l': 'Your name',
      'contact.name.ph': 'First and last',
      'contact.company.l': 'Company',
      'contact.company.ph': 'Brand or agency name',
      'contact.email.l': 'Email',
      'contact.email.ph': 'you@company.com',
      'contact.region.l': 'Where are you based?',
      'contact.consent.l': 'Send me the brief summary and next steps by email.',

      // Review
      'review.h': 'Here’s your brief.',
      'review.p': 'Look it over. Open it and the desk picks it up — you’ll get a confirmation and a wave slot.',
      'review.lane': 'Lane',
      'review.plan': 'Scope',
      'review.product': 'Product',
      'review.what': 'What it is',
      'review.who': 'Audience',
      'review.pain': 'Problem',
      'review.cta': 'Call to action',
      'review.tone': 'Tone',
      'review.hooks': 'Hooks / pack',
      'review.formats': 'Formats',
      'review.refs': 'References',
      'review.assets': 'On hand',
      'review.file': 'Attached',
      'review.timing': 'First wave',
      'review.notes': 'Notes',
      'review.contact': 'Contact',
      'review.est.h': 'Estimate',
      'review.est.turn': 'First direction',
      'review.est.turn.v': '1 business day',
      'review.est.wave': 'Wave slot',
      'review.empty': '—',
      'review.edit': 'Edit',

      // Confirmation
      'done.kicker': 'Brief received',
      'done.h': 'The desk has your brief.',
      'done.p': 'We’re reviewing scope now. You’ll get a confirmed direction and your production schedule within one business day.',
      'done.id': 'Brief ID',
      'done.wave': 'Assigned wave',
      'done.lane': 'Lane',
      'done.plan': 'Scope',
      'done.next.h': 'What happens next',
      'done.n1': 'We confirm scope and send a fixed quote.',
      'done.n2': 'You approve, we lock the creative direction.',
      'done.n3': 'Your wave is produced and delivered for review.',
      'done.again': 'Open another brief',
      'done.home': 'Back to site',

      // validation
      'err.required': 'This one’s needed to continue.',
      'err.email': 'That email doesn’t look right.',
      'err.pick': 'Pick at least one.',
      'optional': 'optional',
    },

    ja: {
      'brand.kicker': '制作デスク',
      'brand.sub': '新規ブリーフ',
      'close': '閉じる',
      'resume.note': '下書きを復元しました',
      'reset': '最初から',

      'step.lane': 'ご利用の立場',
      'step.plan': '規模感',
      'step.offer': 'オファー',
      'step.creative': '方向性',
      'step.assets': '素材と時期',
      'step.contact': 'ご連絡先',
      'step.review': '確認',

      'nav.back': '戻る',
      'nav.next': '次へ',
      'nav.submit': 'ブリーフを送る',
      'nav.step': 'ステップ',
      'nav.of': '/',

      'lane.h': 'ブリーフを作りましょう。',
      'lane.p': 'デスクとの組み方は2通り。近いほうを選んでください。あとから変えられます。',
      'lane.brand.t': 'ブランド・事業会社',
      'lane.brand.d': '自社の商品やサービスを売っていて、動画広告を回す仕組みがほしい方へ。',
      'lane.agency.t': '代理店・メディアバイヤー',
      'lane.agency.d': 'クライアントと戦略は御社のもの。動画はホワイトラベルで供給します。',
      'lane.tagline.brand': '創業者・社内チーム向け',
      'lane.tagline.agency': 'ホワイトラベル / コブランド',

      'plan.h': 'まずは規模感を選んでください。',
      'plan.p': '確定ではありません。出発点と概算のための目安です。制作前に必ずすり合わせます。',
      'plan.unsure.t': '選ぶのを手伝って',
      'plan.unsure.d': '迷ったら、オファーから最適な規模をこちらで提案します。',
      'plan.popular': '一番人気',
      'plan.from': '〜',

      'offer.h': '何を売るのか教えてください。',
      'offer.p': 'すべてはオファーから。私たちは見た目ではなく、ここから始めます。',
      'offer.product.l': '商品・サービス名',
      'offer.product.ph': '例：青葉コールドブリュー（定期便）',
      'offer.what.l': 'どんなものか、1〜2行で',
      'offer.what.ph': '何を売っていて、なぜ買う価値があるのか。',
      'offer.who.l': '誰のためのものですか？',
      'offer.who.ph': '買い手はどんな人か。年齢、立場、大事にしていること。',
      'offer.pain.l': 'どんな悩みを解決しますか？',
      'offer.pain.ph': '痛み、ためらい、「使う前」の状態。',
      'offer.cta.l': '見た人に次に何をしてほしいですか？',
      'offer.cta.ph': '今すぐ購入・無料で試す・相談を予約・サイトを見る',

      'creative.h': '方向性を決めましょう。',
      'creative.p': '出発点となる雰囲気といくつかの選択。制作前に具体的な方向性へ落とし込みます。',
      'creative.tone.l': 'トーン（3つまで）',
      'creative.hooks.l': '1パックあたりのフック案',
      'creative.formats.l': '納品フォーマット',
      'creative.refs.l': '参考リンク（任意）',
      'creative.refs.ph': '広告のリンク、競合、ムードボードなど、何でも貼ってください。',

      'assets.h': '素材と時期。',
      'assets.p': 'お渡しできるものと、最初のウェーブの希望時期を教えてください。',
      'assets.ready.l': 'すでにお持ちのものは？',
      'assets.footage': '撮影素材・クリップ',
      'assets.product': '商品写真',
      'assets.logo': 'ロゴ・ブランドキット',
      'assets.none': 'まだ何もない（ゼロから）',
      'assets.drop.l': 'ブリーフ・資料・ブランド資料を添付',
      'assets.drop.ph': 'ここにドラッグ、またはクリックで選択',
      'assets.drop.note': 'PDF・スライド・フォルダのリンクなど（任意）',
      'assets.timing.l': '最初のウェーブはいつ頃？',
      'assets.notes.l': 'ブランドメモ（任意）',
      'assets.notes.ph': 'トーン、避けたい言葉、必ず入れたい訴求、法務の文言など…',

      'contact.h': 'どちらにお送りしますか？',
      'contact.p': '確定したスコープと最初の方向性を、1営業日以内にお返しします。',
      'contact.name.l': 'お名前',
      'contact.name.ph': '姓名',
      'contact.company.l': '会社名',
      'contact.company.ph': 'ブランド名・代理店名',
      'contact.email.l': 'メールアドレス',
      'contact.email.ph': 'you@company.com',
      'contact.region.l': '拠点はどちらですか？',
      'contact.consent.l': 'ブリーフの概要と次のステップをメールで受け取る。',

      'review.h': 'こちらがブリーフです。',
      'review.p': '内容をご確認ください。送るとデスクが受け取り、確認と制作枠をお返しします。',
      'review.lane': '立場',
      'review.plan': '規模感',
      'review.product': '商品',
      'review.what': '概要',
      'review.who': 'ターゲット',
      'review.pain': '課題',
      'review.cta': '行動喚起',
      'review.tone': 'トーン',
      'review.hooks': 'フック / パック',
      'review.formats': 'フォーマット',
      'review.refs': '参考',
      'review.assets': '手持ち素材',
      'review.file': '添付',
      'review.timing': '最初のウェーブ',
      'review.notes': 'メモ',
      'review.contact': '連絡先',
      'review.est.h': '目安',
      'review.est.turn': '最初の方向性',
      'review.est.turn.v': '1営業日',
      'review.est.wave': '制作枠',
      'review.empty': '—',
      'review.edit': '編集',

      'done.kicker': 'ブリーフを受け取りました',
      'done.h': 'デスクがブリーフを受け取りました。',
      'done.p': '現在スコープを確認しています。確定した方向性と制作スケジュールを、1営業日以内にお送りします。',
      'done.id': 'ブリーフID',
      'done.wave': '割り当てウェーブ',
      'done.lane': '立場',
      'done.plan': '規模感',
      'done.next.h': 'この後の流れ',
      'done.n1': 'スコープを確定し、固定見積もりをお送りします。',
      'done.n2': 'ご承認後、クリエイティブの方向性を確定します。',
      'done.n3': 'ウェーブを制作し、レビュー用に納品します。',
      'done.again': 'もう一件作る',
      'done.home': 'サイトに戻る',

      'err.required': '続けるにはこの項目が必要です。',
      'err.email': 'メールアドレスをご確認ください。',
      'err.pick': '1つ以上選んでください。',
      'optional': '任意',
    }
  };

  // ---- Plans (mirror the site's pricing) ----
  const PLANS = {
    brand: [
      { id: 'sprout',   popular: false, name: { en: 'Sprout', ja: 'Sprout' }, tier: { en: 'Trial · one-time', ja: 'トライアル・初回のみ' }, price: { en: '$99', ja: '$99' }, per: { en: 'one-time', ja: '初回のみ' }, blurb: { en: '1 pack · 1 master cut · 7-day turnaround', ja: '1パック・マスター1本・納期7日' } },
      { id: 'standard', popular: false, name: { en: 'Standard', ja: 'Standard' }, tier: { en: 'Monthly', ja: '月額' }, price: { en: '$997', ja: '$997' }, per: { en: '/ mo', ja: '/ 月' }, blurb: { en: '6 packs / month · planned waves', ja: '6パック/月・計画ウェーブ' } },
      { id: 'pro',      popular: true,  name: { en: 'Pro', ja: 'Pro' }, tier: { en: 'Monthly', ja: '月額' }, price: { en: '$1,997', ja: '$1,997' }, per: { en: '/ mo', ja: '/ 月' }, blurb: { en: '12 packs · voiceover · priority', ja: '12パック・ナレーション・優先' } },
      { id: 'ent',      popular: false, name: { en: 'Enterprise', ja: 'Enterprise' }, tier: { en: 'High capacity', ja: '大量供給' }, price: { en: '$2,497+', ja: '$2,497〜' }, per: { en: '/ mo', ja: '/ 月' }, blurb: { en: '15 packs · custom cadence', ja: '15パック・カスタム頻度' } },
    ],
    agency: [
      { id: 'sprint',  popular: false, name: { en: 'Partner Test Sprint', ja: 'Partner Test Sprint' }, tier: { en: 'Sprint · one-time', ja: 'スプリント・初回のみ' }, price: { en: '$297+', ja: '$297〜' }, per: { en: 'one-time', ja: '初回のみ' }, blurb: { en: 'Proof of fit · white-label folder', ja: '相性確認・WL納品フォルダ' } },
      { id: 'starter', popular: false, name: { en: 'Partner Starter', ja: 'Partner Starter' }, tier: { en: 'Monthly', ja: '月額' }, price: { en: '$850+', ja: '$850〜' }, per: { en: '/ mo', ja: '/ 月' }, blurb: { en: '4 packs / month · white-label', ja: '4パック/月・ホワイトラベル' } },
      { id: 'growth',  popular: true,  name: { en: 'Partner Growth', ja: 'Partner Growth' }, tier: { en: 'Monthly', ja: '月額' }, price: { en: '$1,700+', ja: '$1,700〜' }, per: { en: '/ mo', ja: '/ 月' }, blurb: { en: '10 packs · multi-account', ja: '10パック・複数アカウント' } },
      { id: 'scale',   popular: false, name: { en: 'Partner Scale', ja: 'Partner Scale' }, tier: { en: 'Custom', ja: 'カスタム' }, price: { en: 'Custom', ja: 'カスタム' }, per: { en: 'monthly', ja: '月額' }, blurb: { en: 'Dedicated capacity · priority', ja: '専属キャパシティ・優先' } },
    ],
  };

  const TONES = [
    { id: 'bold',      en: 'Bold & direct',     ja: '大胆・直球' },
    { id: 'warm',      en: 'Warm & human',      ja: '温かい・人間味' },
    { id: 'premium',   en: 'Premium & quiet',   ja: '上質・静か' },
    { id: 'playful',   en: 'Playful',           ja: '遊び心' },
    { id: 'urgent',    en: 'Urgent / offer-led',ja: '緊急・オファー先行' },
    { id: 'editorial', en: 'Editorial',         ja: 'エディトリアル' },
    { id: 'ugc',       en: 'UGC / native',      ja: 'UGC・ネイティブ' },
    { id: 'cinematic', en: 'Cinematic',         ja: 'シネマティック' },
  ];

  const FORMATS = [
    { id: '9:16', label: '9:16', note: { en: 'Reels · TikTok · Shorts', ja: 'Reels・TikTok・Shorts' } },
    { id: '1:1',  label: '1:1',  note: { en: 'Feed', ja: 'フィード' } },
    { id: '16:9', label: '16:9', note: { en: 'YouTube · web', ja: 'YouTube・web' } },
    { id: '4:5',  label: '4:5',  note: { en: 'Feed (tall)', ja: 'フィード（縦）' } },
  ];

  const TIMINGS = [
    { id: 'asap',  en: 'As soon as possible', ja: 'できるだけ早く' },
    { id: '2w',    en: 'Within 2 weeks',      ja: '2週間以内' },
    { id: 'month', en: 'This month',          ja: '今月中' },
    { id: 'flex',  en: 'Flexible / planning', ja: '柔軟・検討中' },
  ];

  const REGIONS = [
    { id: 'jp',     en: 'Japan',          ja: '日本' },
    { id: 'apac',   en: 'Asia–Pacific',   ja: 'アジア太平洋' },
    { id: 'na',     en: 'North America',  ja: '北米' },
    { id: 'eu',     en: 'Europe',         ja: 'ヨーロッパ' },
    { id: 'other',  en: 'Elsewhere',      ja: 'その他' },
  ];

  window.INTAKE = { DICT, PLANS, TONES, FORMATS, TIMINGS, REGIONS };
})();
