const { dynamoDB } = require('../../aws');
const log = require('../../../logger');
const { getUser } = require('../../../util/store');
let user;

const processUserAndProduct = async () => {
    // 사용자 정보 가져오기
    user = await getUser();

    if (user) {
        log.info('[STORE]User Info:', user);
    } else {
        log.error('[STORE]No user found in store.');

    }
}

processUserAndProduct().then();

/**
 * 공지사항을 DynamoDB에 저장
 * @param {Object} notice 공지 데이터
 */
const saveNoticeToDynamoDB = async (notice) => {
    try {
        const now = new Date();
        const kstTimestamp = new Date(now.getTime() + 9 * 60 * 60 * 1000); // KST 기준 시간

        const noticeData = {
            ...notice,
            userId: user.userId,
            noticeId: notice.noticeId || `notice-${kstTimestamp.getTime()}`, // noticeId 자동 생성 (없을 경우)
            timestamp: kstTimestamp.toISOString()
        };

        // 🔥 1️⃣ 기존 공지 개수 확인
        const existingNotices = await getAllNotices();
        if (existingNotices.length >= 3) {
            // 🔥 2️⃣ 가장 오래된 공지 삭제
            const oldestNotice = existingNotices.reduce((prev, curr) =>
                prev.timestamp < curr.timestamp ? prev : curr
            );
            await deleteNotice(oldestNotice.noticeId);
            log.info(`✅ 이전 공지사항 삭제 완료: ${oldestNotice.noticeId}`);
        }

        // 🔥 3️⃣ 새 공지 저장
        const params = {
            TableName: 'model_notice',
            Item: noticeData
        };

        await dynamoDB.put(params).promise();
        log.info(`공지 저장 성공: ${noticeData.noticeId}`);
    } catch (error) {
        log.error('공지 저장 중 오류 발생:', error);
    }
};

/**
 * 📌 현재 저장된 모든 공지 가져오기 (최신 순으로 정렬)
 */
const getAllNotices = async () => {
    try {
        const params = {
            TableName: 'model_notice',
            ProjectionExpression: "noticeId, #ts",
            ExpressionAttributeNames: { "#ts": "timestamp" } // ✅ 예약어 충돌 방지
        };

        const result = await dynamoDB.scan(params).promise();
        return result.Items || [];
    } catch (error) {
        console.error("❌ 공지 조회 중 오류 발생:", error);
        return [];
    }
};


/**
 * 특정 공지사항 조회
 * @param {string} noticeId 공지 ID
 * @returns {Promise<Object>} 공지 데이터
 */
const getNotice = async (noticeId) => {
    try {
        const params = {
            TableName: 'model_notice',
            Key: { noticeId }
        };

        const data = await dynamoDB.get(params).promise();
        if (!data.Item) {
            log.warn(`공지 조회 실패: ${noticeId} (데이터 없음)`);
            return null;
        }

        log.info(`공지 조회 성공: ${noticeId}`);
        return data.Item;
    } catch (error) {
        log.error('공지 조회 중 오류 발생:', error);
        return null;
    }
};

/**
 * 공지사항 수정
 * @param {string} noticeId 수정할 공지 ID
 * @param {Object} updatedFields 업데이트할 필드
 */
const updateNotice = async (noticeId, updatedFields) => {
    try {
        let updateExpression = "SET";
        let expressionAttributeValues = {};

        Object.keys(updatedFields).forEach((key, index) => {
            updateExpression += ` ${key} = :${key}${index < Object.keys(updatedFields).length - 1 ? "," : ""}`;
            expressionAttributeValues[`:${key}`] = updatedFields[key];
        });

        const params = {
            TableName: 'model_notice',
            Key: { noticeId },
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: expressionAttributeValues
        };

        await dynamoDB.update(params).promise();
        log.info(`공지 수정 성공: ${noticeId}`);
    } catch (error) {
        log.error('공지 수정 중 오류 발생:', error);
    }
};

/**
 * 공지사항 삭제
 * @param {string} noticeId 삭제할 공지 ID
 */
const deleteNotice = async (noticeId) => {
    try {
        const params = {
            TableName: 'model_notice',
            Key: { noticeId }
        };

        await dynamoDB.delete(params).promise();
        log.info(`공지 삭제 성공: ${noticeId}`);
    } catch (error) {
        log.error('공지 삭제 중 오류 발생:', error);
    }
};

/**
 * 특정 기간 내의 공지사항 조회
 * @param {string} startDate 조회 시작 날짜 (ISO 8601)
 * @param {string} endDate 조회 종료 날짜 (ISO 8601)
 * @param {boolean} ascending 정렬 방향 (true: 오름차순, false: 내림차순)
 * @returns {Promise<Array>} 조회된 공지 리스트
 */
const getNoticesByDateRange = async (startDate, endDate, ascending = true) => {
    try {
        const params = {
            TableName: 'model_notice',
            FilterExpression: 'startDate BETWEEN :startDate AND :endDate',
            ExpressionAttributeValues: {
                ':startDate': startDate,
                ':endDate': endDate
            },
            ScanIndexForward: ascending
        };

        const result = await dynamoDB.scan(params).promise();

        log.info(`기간별 공지 조회 성공: ${result.Items.length}건`);
        return result.Items || [];
    } catch (error) {
        log.error('기간별 공지 조회 중 오류 발생:', error);
        return [];
    }
};

module.exports = {
    saveNoticeToDynamoDB,
    getNotice,
    updateNotice,
    deleteNotice,
    getNoticesByDateRange
}