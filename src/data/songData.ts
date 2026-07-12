import type { Appointment, HistoricalEvent, Person, Place, Relation, Source, Work } from '../types'

export const sources: Source[] = [
  {
    id: 'songshi-338',
    title: '《宋史》卷三百三十八·苏轼传',
    type: 'primary',
    url: 'https://zh.wikisource.org/wiki/宋史/卷338',
    citation: '脱脱等：《宋史》卷三百三十八，列传第九十七。',
    note: '人物生平与仕宦事件的第一层依据；具体日期仍需与年谱、文集和编年材料互校。'
  },
  {
    id: 'cbdb',
    title: '中国历代人物传记资料库（CBDB）',
    type: 'database',
    url: 'https://cbdb.hsites.harvard.edu/',
    citation: 'China Biographical Database Project, Harvard University et al.',
    note: '用于人物、亲属、社会关系、科举与官职数据的对照和后续批量导入。'
  },
  {
    id: 'chgis',
    title: '中国历史地理信息系统（CHGIS）',
    type: 'database',
    url: 'https://chgis.fas.harvard.edu/',
    citation: 'China Historical Geographic Information System, Harvard and Fudan Universities.',
    note: '用于历史地名、行政区沿革和空间坐标的标准化。当前演示坐标仅为现代城市近似点。'
  },
  {
    id: 'demo-curation',
    title: '观宋示例数据整理说明',
    type: 'reference',
    citation: 'SongScope demo dataset, v0.1.',
    note: '用于验证数据结构和交互设计，不应直接作为正式研究结论引用。'
  }
]

export const places: Place[] = [
  { id: 'meishan', name: '眉山', historicalName: '眉州眉山', modernName: '四川眉山', latitude: 30.05, longitude: 103.83, level: 'prefecture', summary: '苏氏父子故里。', sourceIds: ['songshi-338', 'chgis'] },
  { id: 'kaifeng', name: '汴京', historicalName: '东京开封府', modernName: '河南开封', latitude: 34.8, longitude: 114.31, level: 'capital', summary: '北宋政治、科举与文官网络的中心。', sourceIds: ['chgis'] },
  { id: 'fengxiang', name: '凤翔', historicalName: '凤翔府', modernName: '陕西宝鸡凤翔区', latitude: 34.52, longitude: 107.4, level: 'prefecture', summary: '苏轼早期地方任职地。', sourceIds: ['songshi-338', 'chgis'] },
  { id: 'hangzhou', name: '杭州', historicalName: '杭州', modernName: '浙江杭州', latitude: 30.27, longitude: 120.15, level: 'prefecture', summary: '苏轼两度任职的重要城市。', sourceIds: ['songshi-338', 'chgis'] },
  { id: 'mizhou', name: '密州', historicalName: '密州', modernName: '山东诸城一带', latitude: 35.99, longitude: 119.41, level: 'prefecture', summary: '苏轼知密州时期的创作与地方治理现场。', sourceIds: ['songshi-338', 'chgis'] },
  { id: 'xuzhou', name: '徐州', historicalName: '徐州', modernName: '江苏徐州', latitude: 34.26, longitude: 117.19, level: 'prefecture', summary: '熙宁十年黄河水患与守城事件发生地。', sourceIds: ['songshi-338', 'chgis'] },
  { id: 'huzhou', name: '湖州', historicalName: '湖州', modernName: '浙江湖州', latitude: 30.89, longitude: 120.09, level: 'prefecture', summary: '乌台诗案前苏轼任知州之地。', sourceIds: ['songshi-338', 'chgis'] },
  { id: 'huangzhou', name: '黄州', historicalName: '黄州', modernName: '湖北黄冈', latitude: 30.45, longitude: 114.87, level: 'prefecture', summary: '苏轼贬居、思想与文学创作的重要转折点。', sourceIds: ['songshi-338', 'chgis'] },
  { id: 'yingzhou', name: '颍州', historicalName: '颍州', modernName: '安徽阜阳', latitude: 32.89, longitude: 115.81, level: 'prefecture', summary: '元祐时期苏轼外任地点之一。', sourceIds: ['chgis', 'demo-curation'] },
  { id: 'huizhou', name: '惠州', historicalName: '惠州', modernName: '广东惠州', latitude: 23.11, longitude: 114.42, level: 'prefecture', summary: '绍圣年间苏轼岭南贬所。', sourceIds: ['songshi-338', 'chgis'] },
  { id: 'danzhou', name: '儋州', historicalName: '昌化军', modernName: '海南儋州', latitude: 19.52, longitude: 109.58, level: 'region', summary: '苏轼晚年渡海后的贬居地。', sourceIds: ['songshi-338', 'chgis'] },
  { id: 'changzhou', name: '常州', historicalName: '常州', modernName: '江苏常州', latitude: 31.81, longitude: 119.97, level: 'prefecture', summary: '苏轼北归后卒于此地。', sourceIds: ['songshi-338', 'chgis'] }
]

export const people: Person[] = [
  { id: 'su-shi', names: [{ text: '苏轼', kind: 'primary' }, { text: '子瞻', kind: 'courtesy' }, { text: '东坡居士', kind: 'art-name' }], birthYear: 1037, deathYear: 1101, nativePlaceId: 'meishan', roles: ['文学家', '官员', '书画家'], summary: '观宋第一阶段的纵向样板人物，以其仕宦、迁徙、交游与作品连接多类历史数据。', sourceIds: ['songshi-338', 'cbdb'] },
  { id: 'su-zhe', names: [{ text: '苏辙', kind: 'primary' }, { text: '子由', kind: 'courtesy' }], birthYear: 1039, deathYear: 1112, nativePlaceId: 'meishan', roles: ['官员', '文学家'], summary: '苏轼之弟，仕途与贬谪轨迹为比较研究提供天然对照。', sourceIds: ['cbdb'] },
  { id: 'su-xun', names: [{ text: '苏洵', kind: 'primary' }, { text: '明允', kind: 'courtesy' }], birthYear: 1009, deathYear: 1066, nativePlaceId: 'meishan', roles: ['文学家'], summary: '苏轼、苏辙之父，唐宋古文传统中的重要人物。', sourceIds: ['cbdb'] },
  { id: 'ouyang-xiu', names: [{ text: '欧阳修', kind: 'primary' }, { text: '永叔', kind: 'courtesy' }, { text: '六一居士', kind: 'art-name' }], birthYear: 1007, deathYear: 1072, roles: ['官员', '文学家', '史家'], summary: '嘉祐文坛领袖，也是苏轼进入中央文坛的重要识拔者。', sourceIds: ['cbdb', 'songshi-338'] },
  { id: 'wang-anshi', names: [{ text: '王安石', kind: 'primary' }, { text: '介甫', kind: 'courtesy' }, { text: '半山', kind: 'art-name' }], birthYear: 1021, deathYear: 1086, roles: ['宰相', '政治家', '文学家'], summary: '熙宁变法核心人物，与苏轼在政策上长期存在分歧。', sourceIds: ['cbdb', 'songshi-338'] },
  { id: 'sima-guang', names: [{ text: '司马光', kind: 'primary' }, { text: '君实', kind: 'courtesy' }], birthYear: 1019, deathYear: 1086, roles: ['宰相', '史家'], summary: '元祐更化的核心人物，与苏轼既有友谊亦有具体政策分歧。', sourceIds: ['cbdb', 'songshi-338'] },
  { id: 'huang-tingjian', names: [{ text: '黄庭坚', kind: 'primary' }, { text: '鲁直', kind: 'courtesy' }, { text: '山谷道人', kind: 'art-name' }], birthYear: 1045, deathYear: 1105, roles: ['文学家', '书法家', '官员'], summary: '苏门重要成员，适合连接文学唱和、书信与政治网络。', sourceIds: ['cbdb'] },
  { id: 'qin-guan', names: [{ text: '秦观', kind: 'primary' }, { text: '少游', kind: 'courtesy' }], birthYear: 1049, deathYear: 1100, roles: ['词人', '官员'], summary: '苏门人物之一，其仕途与文学网络可用于观察党争冲击。', sourceIds: ['cbdb'] },
  { id: 'zhang-dun', names: [{ text: '章惇', kind: 'primary' }, { text: '子厚', kind: 'courtesy' }], birthYear: 1035, deathYear: 1105, roles: ['宰相', '政治家'], summary: '与苏轼早年有交往，后在政治立场和权力结构中走向对立。', sourceIds: ['cbdb', 'songshi-338'] },
  { id: 'shen-kuo', names: [{ text: '沈括', kind: 'primary' }, { text: '存中', kind: 'courtesy' }], birthYear: 1031, deathYear: 1095, roles: ['官员', '科学家'], summary: '可作为制度史、科技史和新法官僚群体的数据入口。', sourceIds: ['cbdb'] }
]

export const appointments: Appointment[] = [
  { id: 'appt-1061-fengxiang', personId: 'su-shi', startYear: 1061, endYear: 1064, office: '大理评事', duty: '签书凤翔府判官', placeId: 'fengxiang', action: '除', summary: '苏轼早期正式地方任职。', certainty: 'high', sourceIds: ['songshi-338'] },
  { id: 'appt-1071-hangzhou', personId: 'su-shi', startYear: 1071, endYear: 1074, office: '尚书祠部员外郎', duty: '杭州通判', placeId: 'hangzhou', action: '徙', summary: '因与新法意见不合而请求外任。', certainty: 'high', sourceIds: ['songshi-338'] },
  { id: 'appt-1074-mizhou', personId: 'su-shi', startYear: 1074, endYear: 1076, office: '尚书祠部员外郎', duty: '知密州', placeId: 'mizhou', action: '徙', summary: '密州时期兼具地方治理、灾荒应对与文学创作价值。', certainty: 'high', sourceIds: ['songshi-338'] },
  { id: 'appt-1077-xuzhou', personId: 'su-shi', startYear: 1077, endYear: 1079, office: '尚书祠部员外郎', duty: '知徐州', placeId: 'xuzhou', action: '徙', summary: '任内遭遇黄河决口并组织守城。', certainty: 'high', sourceIds: ['songshi-338'] },
  { id: 'appt-1079-huzhou', personId: 'su-shi', startYear: 1079, office: '尚书祠部员外郎', duty: '知湖州', placeId: 'huzhou', action: '徙', summary: '到任不久即因乌台诗案被逮。', certainty: 'high', sourceIds: ['songshi-338'] },
  { id: 'appt-1080-huangzhou', personId: 'su-shi', startYear: 1080, endYear: 1084, office: '黄州团练副使', duty: '本州安置', placeId: 'huangzhou', action: '贬', summary: '有官名而无实权的贬居阶段。', certainty: 'high', sourceIds: ['songshi-338'] },
  { id: 'appt-1086-hanlin', personId: 'su-shi', startYear: 1086, endYear: 1089, office: '翰林学士', duty: '知制诰、侍从', placeId: 'kaifeng', action: '迁', summary: '元祐初年迅速回到中央要职。', certainty: 'high', sourceIds: ['songshi-338'] },
  { id: 'appt-1089-hangzhou', personId: 'su-shi', startYear: 1089, endYear: 1091, office: '龙图阁学士', duty: '知杭州', placeId: 'hangzhou', action: '徙', summary: '第二次在杭州任职。', certainty: 'medium', sourceIds: ['demo-curation'] },
  { id: 'appt-1091-yingzhou', personId: 'su-shi', startYear: 1091, endYear: 1092, office: '龙图阁学士', duty: '知颍州', placeId: 'yingzhou', action: '徙', summary: '元祐末期外任之一。', certainty: 'medium', sourceIds: ['demo-curation'] },
  { id: 'appt-1094-huizhou', personId: 'su-shi', startYear: 1094, endYear: 1097, office: '宁远军节度副使', duty: '惠州安置', placeId: 'huizhou', action: '贬', summary: '绍圣政治逆转后的岭南贬谪。', certainty: 'medium', sourceIds: ['songshi-338'] },
  { id: 'appt-1097-danzhou', personId: 'su-shi', startYear: 1097, endYear: 1100, office: '琼州别驾', duty: '昌化军安置', placeId: 'danzhou', action: '贬', summary: '渡海至海南，是其仕宦地理的最远点。', certainty: 'high', sourceIds: ['songshi-338'] }
]

export const events: HistoricalEvent[] = [
  { id: 'event-1057-jinshi', title: '嘉祐二年礼部试与殿试', year: 1057, kind: 'life', personIds: ['su-shi', 'su-zhe', 'ouyang-xiu'], placeId: 'kaifeng', summary: '苏轼、苏辙登科；欧阳修识拔苏轼文章。', certainty: 'high', sourceIds: ['songshi-338'] },
  { id: 'event-1069-reform', title: '熙宁变法展开', year: 1069, kind: 'politics', personIds: ['wang-anshi', 'su-shi', 'shen-kuo'], placeId: 'kaifeng', summary: '新法成为此后官僚分化、地方治理和政治网络变化的核心背景。', certainty: 'high', sourceIds: ['demo-curation'] },
  { id: 'event-1075-mizhou-hunt', title: '密州出猎与词作', year: 1075, kind: 'literature', personIds: ['su-shi'], placeId: 'mizhou', summary: '《江城子·密州出猎》把地方经历、政治抱负与词体拓展连接起来。', certainty: 'medium', sourceIds: ['demo-curation'] },
  { id: 'event-1076-midautumn', title: '密州中秋', year: 1076, kind: 'literature', personIds: ['su-shi', 'su-zhe'], placeId: 'mizhou', summary: '《水调歌头·明月几时有》的创作背景。', certainty: 'high', sourceIds: ['demo-curation'] },
  { id: 'event-1077-flood', title: '徐州黄河水患', year: 1077, kind: 'disaster', personIds: ['su-shi'], placeId: 'xuzhou', summary: '黄河决口后洪水逼城，苏轼组织军民筑堤守城。', certainty: 'high', sourceIds: ['songshi-338'] },
  { id: 'event-1079-wutai', title: '乌台诗案', year: 1079, kind: 'politics', personIds: ['su-shi'], placeId: 'kaifeng', summary: '由诗文政治解读引发的重大案件，改变苏轼此后的仕途与创作。', certainty: 'high', sourceIds: ['songshi-338'] },
  { id: 'event-1082-red-cliff', title: '黄州赤壁书写', year: 1082, kind: 'literature', personIds: ['su-shi'], placeId: 'huangzhou', summary: '前后《赤壁赋》及《念奴娇·赤壁怀古》等作品集中出现。', certainty: 'high', sourceIds: ['demo-curation'] },
  { id: 'event-1084-northbound', title: '离黄州北行', year: 1084, kind: 'travel', personIds: ['su-shi', 'wang-anshi'], placeId: 'huangzhou', summary: '离开黄州后北行，并在金陵与王安石会面。', certainty: 'medium', sourceIds: ['songshi-338'] },
  { id: 'event-1085-yuanyou', title: '元祐政局开启', year: 1085, kind: 'politics', personIds: ['sima-guang', 'su-shi', 'zhang-dun'], placeId: 'kaifeng', summary: '神宗去世、哲宗即位后政治结构转变，苏轼迅速起复。', certainty: 'high', sourceIds: ['songshi-338'] },
  { id: 'event-1094-huizhou', title: '贬谪惠州', year: 1094, kind: 'travel', personIds: ['su-shi', 'zhang-dun'], placeId: 'huizhou', summary: '绍圣政局逆转后，苏轼被贬往岭南。', certainty: 'high', sourceIds: ['songshi-338'] },
  { id: 'event-1097-cross-sea', title: '渡海至儋州', year: 1097, kind: 'travel', personIds: ['su-shi', 'su-zhe'], placeId: 'danzhou', summary: '苏轼进一步被贬至昌化军，兄弟在南行途中短暂相会。', certainty: 'high', sourceIds: ['songshi-338'] },
  { id: 'event-1101-death', title: '北归后卒于常州', year: 1101, kind: 'life', personIds: ['su-shi'], placeId: 'changzhou', summary: '苏轼结束岭南与海南贬谪后北归，最终卒于常州。', certainty: 'high', sourceIds: ['demo-curation'] }
]

export const relations: Relation[] = [
  { id: 'rel-shi-zhe', sourcePersonId: 'su-shi', targetPersonId: 'su-zhe', kind: 'kinship', label: '兄弟', summary: '长期通信、唱和并共享多次政治命运。', certainty: 'high', sourceIds: ['cbdb'] },
  { id: 'rel-xun-shi', sourcePersonId: 'su-xun', targetPersonId: 'su-shi', kind: 'kinship', label: '父子', summary: '苏氏家学与共同入京构成重要家庭背景。', certainty: 'high', sourceIds: ['cbdb', 'songshi-338'] },
  { id: 'rel-ouyang-shi', sourcePersonId: 'ouyang-xiu', targetPersonId: 'su-shi', kind: 'mentor', label: '识拔与文坛前辈', startYear: 1057, summary: '欧阳修在礼部试中赏识苏轼文章，并推动其声名建立。', certainty: 'high', sourceIds: ['songshi-338'] },
  { id: 'rel-wang-shi', sourcePersonId: 'wang-anshi', targetPersonId: 'su-shi', kind: 'political', label: '政策分歧与晚年相见', startYear: 1069, summary: '二人在新法问题上存在根本分歧，但关系不能简化为私人仇敌。', certainty: 'high', sourceIds: ['songshi-338'] },
  { id: 'rel-sima-shi', sourcePersonId: 'sima-guang', targetPersonId: 'su-shi', kind: 'political', label: '友人及政策争论者', summary: '元祐时期对役法等政策仍有公开分歧。', certainty: 'high', sourceIds: ['songshi-338'] },
  { id: 'rel-huang-shi', sourcePersonId: 'su-shi', targetPersonId: 'huang-tingjian', kind: 'literary', label: '苏门与唱和', summary: '后世常并称“苏黄”，适合展开作品、书信和书法关系。', certainty: 'high', sourceIds: ['cbdb'] },
  { id: 'rel-qin-shi', sourcePersonId: 'su-shi', targetPersonId: 'qin-guan', kind: 'literary', label: '苏门', summary: '文学交游与政治牵连相互交织。', certainty: 'high', sourceIds: ['cbdb'] },
  { id: 'rel-zhang-shi', sourcePersonId: 'zhang-dun', targetPersonId: 'su-shi', kind: 'political', label: '旧交与后期对立', summary: '早年交往与晚年政治迫害之间形成复杂关系。', certainty: 'medium', sourceIds: ['songshi-338', 'cbdb'] },
  { id: 'rel-wang-shen', sourcePersonId: 'wang-anshi', targetPersonId: 'shen-kuo', kind: 'colleague', label: '新法官僚网络', summary: '可作为科技、财政与制度改革数据的扩展入口。', certainty: 'medium', sourceIds: ['cbdb'] }
]

export const works: Work[] = [
  { id: 'work-mizhou-hunt', title: '江城子·密州出猎', authorId: 'su-shi', year: 1075, genre: '词', placeId: 'mizhou', excerpt: '老夫聊发少年狂。', themes: ['出猎', '报国', '地方任职'], sourceIds: ['demo-curation'] },
  { id: 'work-midautumn', title: '水调歌头·明月几时有', authorId: 'su-shi', year: 1076, genre: '词', placeId: 'mizhou', excerpt: '但愿人长久，千里共婵娟。', themes: ['中秋', '兄弟', '月'], sourceIds: ['demo-curation'] },
  { id: 'work-first-rhapsody', title: '前赤壁赋', authorId: 'su-shi', year: 1082, genre: '文', placeId: 'huangzhou', themes: ['赤壁', '宇宙', '人生'], sourceIds: ['demo-curation'] },
  { id: 'work-red-cliff-ci', title: '念奴娇·赤壁怀古', authorId: 'su-shi', year: 1082, genre: '词', placeId: 'huangzhou', excerpt: '大江东去，浪淘尽，千古风流人物。', themes: ['怀古', '赤壁', '时间'], sourceIds: ['demo-curation'] },
  { id: 'work-dingfengbo', title: '定风波·莫听穿林打叶声', authorId: 'su-shi', year: 1082, genre: '词', placeId: 'huangzhou', themes: ['风雨', '旷达', '贬谪'], sourceIds: ['demo-curation'] },
  { id: 'work-chengtian', title: '记承天寺夜游', authorId: 'su-shi', year: 1083, genre: '文', placeId: 'huangzhou', themes: ['月夜', '友人', '贬居'], sourceIds: ['demo-curation'] }
]
