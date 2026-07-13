BEGIN;
TRUNCATE curation_activity, evidence_link, assertion, service_episode, appointment_component,
  appointment_action, event_participation, event, source_locator, source_item, source_work,
  office_concept, place, temporal_extent, person, entity_registry, dataset_version RESTART IDENTITY CASCADE;

INSERT INTO dataset_version(version, description) VALUES
('2026.07.13-mizhou.1', 'First evidence-backed vertical slice: Su Shi transferred from Hangzhou to govern Mizhou.');

INSERT INTO entity_registry(sid, entity_type, label) VALUES
('person:sushi','person','苏轼'),
('place:hangzhou','place','杭州'),
('place:mizhou','place','密州'),
('office:tongpan','office','通判'),
('office:zhizhou','office','知州'),
('time:1074-year','temporal_extent','熙宁七年'),
('time:1074-service-open','temporal_extent','熙宁七年起（终点待进一步校勘）'),
('event:appointment:sushi-mizhou-1074','event','苏轼徙知密州'),
('service:sushi-mizhou-1074','service','苏轼知密州任职阶段'),
('source:work:songshi','source_work','《宋史》'),
('source:item:songshi-338-wikisource','source_item','维基文库《宋史》卷338电子文本'),
('source:item:songshi-zhonghua','source_item','中华书局点校本《宋史》卷338'),
('locator:songshi-338-mizhou-web','source_locator','《宋史》卷338“徙知密州”段'),
('locator:songshi-338-mizhou-print','source_locator','中华书局点校本卷338'),
('assertion:sushi-appointed-mizhou','assertion','苏轼被徙知密州'),
('assertion:sushi-served-mizhou','assertion','苏轼实际进入知密州任职阶段'),
('curation:mizhou-normalisation-1','curation','密州除授规范化活动');

INSERT INTO person VALUES
('person:sushi','苏轼','蘇軾',1037,1101,'北宋官员、文学家；观宋第一条证据链的主体。');

INSERT INTO temporal_extent VALUES
('time:1074-year','熙宁七年','1074-01-01','1074-12-31','year','inferred','chinese-regnal','1074年沿用通行编年；《宋史》本段仅记“徙知密州”，未给出月日，后续须用年谱或诏令复核。'),
('time:1074-service-open','熙宁七年起（终点待进一步校勘）','1074-01-01',NULL,'year','inferred','chinese-regnal','开始年由任命记载推定；任期终点不由本条任命自动推出。');

INSERT INTO place VALUES
('place:hangzhou','杭州','杭州','prefecture','modern-proxy',ST_SetSRID(ST_MakePoint(120.1551,30.2741),4326),'当前点位为现代杭州近似点，不代表北宋州界。'),
('place:mizhou','密州','密州','prefecture','modern-proxy',ST_SetSRID(ST_MakePoint(119.4101,35.9957),4326),'当前点位采用诸城近似点；历史州界待接入 CHGIS 后替换。');

INSERT INTO office_concept VALUES
('office:tongpan','通判','duty-assignment','地方佐贰差遣；此处表示苏轼此前的杭州通判身份。'),
('office:zhizhou','知州','duty-assignment','主持一州政务的差遣概念，不等同于寄禄官。');

INSERT INTO source_work VALUES
('source:work:songshi','《宋史》','脱脱等','primary-source');

INSERT INTO source_item VALUES
('source:item:songshi-338-wikisource','source:work:songshi','维基文库《宋史》卷338电子文本','https://zh.wikisource.org/wiki/宋史/卷338','《宋史》卷三百三十八，列传第九十七，苏轼传，维基文库电子文本。'),
('source:item:songshi-zhonghua','source:work:songshi','中华书局点校本《宋史》卷338',NULL,'脱脱等：《宋史》，中华书局点校本，卷三百三十八。');

INSERT INTO source_locator VALUES
('locator:songshi-338-mizhou-web','source:item:songshi-338-wikisource','paragraph','苏轼传：通判杭州后','軾遂請外，通判杭州。……徙知密州。'),
('locator:songshi-338-mizhou-print','source:item:songshi-zhonghua','juan','卷338·苏轼传',NULL);

INSERT INTO event VALUES
('event:appointment:sushi-mizhou-1074','appointment','徙知密州','time:1074-year','place:mizhou','《宋史》以“徙知密州”记载一次任命/调任动作。');

INSERT INTO event_participation VALUES
('event:appointment:sushi-mizhou-1074','person:sushi','appointee'),
('event:appointment:sushi-mizhou-1074','place:hangzhou','origin'),
('event:appointment:sushi-mizhou-1074','place:mizhou','destination');

INSERT INTO appointment_action VALUES
('event:appointment:sushi-mizhou-1074','person:sushi','event:appointment:sushi-mizhou-1074','transfer','time:1074-year','徙知密州','“徙”与“知密州”拆分为动作、差遣和任所；本记录不声称具体月日。');

INSERT INTO appointment_component(appointment_action_sid, office_concept_sid, place_sid, component_type, raw_expression) VALUES
('event:appointment:sushi-mizhou-1074','office:zhizhou','place:mizhou','duty','知密州'),
('event:appointment:sushi-mizhou-1074','office:zhizhou','place:mizhou','place','密州');

INSERT INTO service_episode VALUES
('service:sushi-mizhou-1074','person:sushi','office:zhizhou','place:mizhou','time:1074-service-open','event:appointment:sushi-mizhou-1074','inferred','任职阶段由任命及随后密州治理叙述支持；开始与结束日期仍须由编年材料细化。');

INSERT INTO assertion VALUES
('assertion:sushi-appointed-mizhou','event:appointment:sushi-mizhou-1074','hasAppointee','person:sushi',NULL,NULL,'accepted',0.990,'《宋史》明确记为“徙知密州”；年份属于另行规范化结果，不由本条原文单独证明。'),
('assertion:sushi-served-mizhou','service:sushi-mizhou-1074','hasOffice','office:zhizhou',NULL,'time:1074-service-open','accepted',0.900,'任命之后《宋史》紧接记载其在密州处置手实法与盗案，支持实际履职，但任期边界尚需进一步校勘。');

INSERT INTO evidence_link VALUES
('assertion:sushi-appointed-mizhou','locator:songshi-338-mizhou-web','supports','电子文本直接出现“徙知密州”。'),
('assertion:sushi-appointed-mizhou','locator:songshi-338-mizhou-print','supports','点校本卷次定位用于正式书目回溯。'),
('assertion:sushi-served-mizhou','locator:songshi-338-mizhou-web','supports','任命后连续叙述密州政务，支持实际任职这一解释。');

INSERT INTO curation_activity(sid, activity_type, agent, description) VALUES
('curation:mizhou-normalisation-1','normalisation','SongScope maintainers','将“徙知密州”拆为 appointment action、appointment component 与独立 service episode；保留原文和换算说明。');
COMMIT;
