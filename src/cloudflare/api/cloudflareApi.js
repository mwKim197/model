const axios = require('axios');
const log = require('../../logger');

const CLOUDFLARE_API_KEY = "f7VXdI_zARzLY8J7D9ECn9QNsB5Ra-YGHNB7vaF3";  // 🔥 Cloudflare에서 생성한 API Token
const CLOUDFLARE_ZONE_ID = "92d2146c95ebb1345bb5175529f748fc";  // 🔥 Cloudflare 대시보드 → "Zone ID" 확인
const CLOUDFLARE_API_URL = `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records`;

/**
 * ✅ Cloudflare에서 기존 서브도메인 레코드 찾기
 */
const getCloudflareDnsRecord = async (subdomain) => {
    try {
        const response = await axios.get(CLOUDFLARE_API_URL, {
            params: { type: "CNAME", name: `${subdomain}.nw-api.org` },
            headers: { "Authorization": `Bearer ${CLOUDFLARE_API_KEY}` }
        });

        if (response.data.success && response.data.result.length > 0) {
            return response.data.result[0]; // 기존 레코드 반환
        }
        return null;
    } catch (error) {
        log.info("❌ DNS 조회 중 오류 발생:", error.message);
        return null;
    }
};

// 서브도메인 생성
const updateOrCreateCloudflareSubdomain = async (subdomain, tunnelUUID) => {
    try {
        log.info(`📌 CNAME 레코드 업데이트: name=${subdomain}.nw-api.org, content=${tunnelUUID}`);

        // 1️⃣ 기존 DNS 레코드 조회
        const existingRecord = await getCloudflareDnsRecord(subdomain);

        if (existingRecord) {
            // 2️⃣ 기존 레코드가 있으면 업데이트 (PUT 요청)
            const updateUrl = `${CLOUDFLARE_API_URL}/${existingRecord.id}`;
            const response = await axios.put(updateUrl, {
                type: "CNAME",
                name: `${subdomain}.nw-api.org`,
                content: `${tunnelUUID}.cfargotunnel.com`, // 새로운 UUID 적용
                ttl: 1,
                proxied: true
            }, {
                headers: {
                    "Authorization": `Bearer ${CLOUDFLARE_API_KEY}`,
                    "Content-Type": "application/json"
                }
            });

            if (response.data.success) {
                log.info(`✅ 기존 레코드 업데이트 완료: ${subdomain}.nw-api.org`);
                return `${subdomain}.nw-api.org`;
            } else {
                log.info("❌ DNS 업데이트 실패:", response.data.errors);
                return null;
            }
        } else {
            // 3️⃣ 기존 레코드가 없으면 새로 생성 (POST 요청)
            const response = await axios.post(CLOUDFLARE_API_URL, {
                type: "CNAME",
                name: `${subdomain}.nw-api.org`,
                content: `${tunnelUUID}.cfargotunnel.com`,
                ttl: 1,
                proxied: true
            }, {
                headers: {
                    "Authorization": `Bearer ${CLOUDFLARE_API_KEY}`,
                    "Content-Type": "application/json"
                }
            });

            if (response.data.success) {
                log.info(`✅ 신규 CNAME 생성 완료: ${subdomain}.nw-api.org`);
                return `${subdomain}.nw-api.org`;
            } else {
                log.info("❌ DNS 생성 실패:", response.data.errors);
                return null;
            }
        }
    } catch (error) {
        log.info("❌ API 요청 오류:", error.message);
        return null;
    }
};

module.exports = {
    updateOrCreateCloudflareSubdomain
}
