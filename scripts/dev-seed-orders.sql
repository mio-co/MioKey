-- 仅限本地开发：在本地 D1 中插入演示订单，用于测试后台订单列表、订单详情、手动发货对话框与前台订单查询。
-- 不改任何表结构。可重复执行（先删除同前缀的演示订单）。
-- 用法：node_modules/.bin/wrangler d1 execute DB --local --file=./scripts/dev-seed-orders.sql --yes
-- 切勿对远程数据库执行。

DELETE FROM orderDelivery WHERE orderId IN (SELECT id FROM `order` WHERE orderNo LIKE 'ORDde00%');
DELETE FROM orderEvent WHERE orderId IN (SELECT id FROM `order` WHERE orderNo LIKE 'ORDde00%');
DELETE FROM paymentAttempt WHERE orderId IN (SELECT id FROM `order` WHERE orderNo LIKE 'ORDde00%');
DELETE FROM `order` WHERE orderNo LIKE 'ORDde00%';

-- 1 待支付（游客，Steam 50 元 ×1）
INSERT INTO `order` (orderNo, ownerUserId, productId, productSkuId, productNameSnapshot, productSkuNameSnapshot, unitPrice, quantity, amount, contactType, contactValue, contactEmailNormalized, paymentProvider, fulfillmentSourceSnapshot, deliveryTypeSnapshot, status, paymentStatus, deliveryStatus, createdAt, updatedAt)
VALUES ('ORDde000000000000000000000000000001', NULL, 1, 1, 'Steam 钱包充值卡', '50 元', 4800, 1, 4800, 'EMAIL', 'buyer1@example.com', 'buyer1@example.com', 'EPAY', 'LOCAL', 'CARD_AUTO', 'PENDING', 'UNPAID', 'NOT_DELIVERED', CAST(strftime('%s','now') AS INTEGER) * 1000 - 600000, CAST(strftime('%s','now') AS INTEGER) * 1000 - 600000);

-- 2 已支付、等待手动发货（ChatGPT Plus，MANUAL）——后台“手动发货”对话框
INSERT INTO `order` (orderNo, ownerUserId, productId, productSkuId, productNameSnapshot, productSkuNameSnapshot, unitPrice, quantity, amount, contactType, contactValue, contactEmailNormalized, buyerNote, paymentProvider, fulfillmentSourceSnapshot, deliveryTypeSnapshot, status, paymentStatus, deliveryStatus, paidAt, createdAt, updatedAt)
VALUES ('ORDde000000000000000000000000000002', 'VadavrkyFp7VVFpLnq0UAyt7gjodky0k', 3, 5, 'ChatGPT Plus', '1 个月', 14900, 1, 14900, 'EMAIL', 'admin@test.com', 'admin@test.com', '请尽快处理，谢谢', 'EPAY', 'LOCAL', 'MANUAL', 'PAID', 'PAID', 'NOT_DELIVERED', CAST(strftime('%s','now') AS INTEGER) * 1000 - 3600000, CAST(strftime('%s','now') AS INTEGER) * 1000 - 3700000, CAST(strftime('%s','now') AS INTEGER) * 1000 - 3600000);

-- 3 已发货（Netflix 3 个月 ×2，自动发卡，登录用户）
INSERT INTO `order` (orderNo, ownerUserId, productId, productSkuId, productNameSnapshot, productSkuNameSnapshot, unitPrice, quantity, amount, contactType, contactValue, contactEmailNormalized, paymentProvider, fulfillmentSourceSnapshot, deliveryTypeSnapshot, status, paymentStatus, deliveryStatus, paidAt, deliveredAt, createdAt, updatedAt)
VALUES ('ORDde000000000000000000000000000003', 'VadavrkyFp7VVFpLnq0UAyt7gjodky0k', 2, 4, 'Netflix 高级会员', '3 个月', 10900, 2, 21800, 'EMAIL', 'admin@test.com', 'admin@test.com', 'STRIPE', 'LOCAL', 'CARD_AUTO', 'DELIVERED', 'PAID', 'DELIVERED', CAST(strftime('%s','now') AS INTEGER) * 1000 - 86400000, CAST(strftime('%s','now') AS INTEGER) * 1000 - 86390000, CAST(strftime('%s','now') AS INTEGER) * 1000 - 86500000, CAST(strftime('%s','now') AS INTEGER) * 1000 - 86390000);
INSERT INTO orderDelivery (orderId, deliveryType, attemptToken, contentSnapshot, status, createdAt)
SELECT id, 'CARD_AUTO', 'demo-token-3', '["NFLX-DEMO-AAAA-1111","NFLX-DEMO-BBBB-2222"]', 'SUCCESS', CAST(strftime('%s','now') AS INTEGER) * 1000 - 86390000 FROM `order` WHERE orderNo = 'ORDde000000000000000000000000000003';

-- 4 已发货（Office 固定内容，游客，带优惠）
INSERT INTO `order` (orderNo, ownerUserId, productId, productSkuId, productNameSnapshot, productSkuNameSnapshot, unitPrice, quantity, amount, contactType, contactValue, contactEmailNormalized, paymentProvider, fulfillmentSourceSnapshot, deliveryTypeSnapshot, fixedDeliveryContentSnapshot, status, paymentStatus, deliveryStatus, discountCodeStr, originalAmount, discountAmount, paidAt, deliveredAt, createdAt, updatedAt)
VALUES ('ORDde000000000000000000000000000004', NULL, 5, 8, 'Office 365 家庭版', '1 年', 19900, 1, 17900, 'EMAIL', 'buyer4@example.com', 'buyer4@example.com', 'ALIPAY', 'LOCAL', 'FIXED_CARD', '兑换链接：https://example.com/redeem', 'DELIVERED', 'PAID', 'DELIVERED', 'DEMO20', 19900, 2000, CAST(strftime('%s','now') AS INTEGER) * 1000 - 172800000, CAST(strftime('%s','now') AS INTEGER) * 1000 - 172790000, CAST(strftime('%s','now') AS INTEGER) * 1000 - 172900000, CAST(strftime('%s','now') AS INTEGER) * 1000 - 172790000);
INSERT INTO orderDelivery (orderId, deliveryType, attemptToken, contentSnapshot, status, createdAt)
SELECT id, 'FIXED_CARD', 'demo-token-4', '["兑换链接：https://example.com/redeem"]', 'SUCCESS', CAST(strftime('%s','now') AS INTEGER) * 1000 - 172790000 FROM `order` WHERE orderNo = 'ORDde000000000000000000000000000004';

-- 5 已关闭（超时未支付）
INSERT INTO `order` (orderNo, ownerUserId, productId, productSkuId, productNameSnapshot, productSkuNameSnapshot, unitPrice, quantity, amount, contactType, contactValue, contactEmailNormalized, paymentProvider, fulfillmentSourceSnapshot, deliveryTypeSnapshot, status, paymentStatus, deliveryStatus, closedAt, createdAt, updatedAt)
VALUES ('ORDde000000000000000000000000000005', NULL, 4, 7, 'Spotify Premium', '12 个月', 15800, 1, 15800, 'EMAIL', 'buyer5@example.com', 'buyer5@example.com', 'EPAY', 'LOCAL', 'CARD_AUTO', 'CLOSED', 'UNPAID', 'NOT_DELIVERED', CAST(strftime('%s','now') AS INTEGER) * 1000 - 259200000, CAST(strftime('%s','now') AS INTEGER) * 1000 - 260000000, CAST(strftime('%s','now') AS INTEGER) * 1000 - 259200000);

-- 6 已支付、手动发货失败（可重试）
INSERT INTO `order` (orderNo, ownerUserId, productId, productSkuId, productNameSnapshot, productSkuNameSnapshot, unitPrice, quantity, amount, contactType, contactValue, contactEmailNormalized, paymentProvider, fulfillmentSourceSnapshot, deliveryTypeSnapshot, status, paymentStatus, deliveryStatus, paidAt, createdAt, updatedAt)
VALUES ('ORDde000000000000000000000000000006', NULL, 3, 5, 'ChatGPT Plus', '1 个月', 14900, 1, 14900, 'EMAIL', 'buyer6@example.com', 'buyer6@example.com', 'EPAY', 'LOCAL', 'MANUAL', 'FAILED', 'PAID', 'FAILED', CAST(strftime('%s','now') AS INTEGER) * 1000 - 7200000, CAST(strftime('%s','now') AS INTEGER) * 1000 - 7300000, CAST(strftime('%s','now') AS INTEGER) * 1000 - 7100000);
INSERT INTO orderDelivery (orderId, deliveryType, attemptToken, errorCode, status, createdAt)
SELECT id, 'MANUAL', 'demo-token-6', '账号库存不足，稍后重试', 'FAILED', CAST(strftime('%s','now') AS INTEGER) * 1000 - 7100000 FROM `order` WHERE orderNo = 'ORDde000000000000000000000000000006';

-- 7 已支付、自动发卡未完成（如当时库存不足）——后台“重试自动发货”
INSERT INTO `order` (orderNo, ownerUserId, productId, productSkuId, productNameSnapshot, productSkuNameSnapshot, unitPrice, quantity, amount, contactType, contactValue, contactEmailNormalized, paymentProvider, fulfillmentSourceSnapshot, deliveryTypeSnapshot, status, paymentStatus, deliveryStatus, paidAt, createdAt, updatedAt)
VALUES ('ORDde000000000000000000000000000007', NULL, 6, 9, 'VPN 月卡', '30 天', 1990, 1, 1990, 'EMAIL', 'buyer7@example.com', 'buyer7@example.com', 'EPAY', 'LOCAL', 'CARD_AUTO', 'PAID', 'PAID', 'NOT_DELIVERED', CAST(strftime('%s','now') AS INTEGER) * 1000 - 1800000, CAST(strftime('%s','now') AS INTEGER) * 1000 - 1900000, CAST(strftime('%s','now') AS INTEGER) * 1000 - 1800000);
