const axios = require('axios');
const log = require('../../logger');

const CLOUDFLARE_API_KEY = "f7VXdI_zARzLY8J7D9ECn9QNsB5Ra-YGHNB7vaF3";  // 🔥 Cloudflare에서 생성한 API Token
const CLOUDFLARE_ZONE_ID = "92d2146c95ebb1345bb5175529f748fc";  // 🔥 Cloudflare 대시보드 → "Zone ID" 확인
const CLOUDFLARE_API_URL = `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records`;

// 서브도메인 생성
const createCloudflareSubdomain = async (subdomain, tunnelUUID) => {
    try {
        const response = await axios.post(CLOUDFLARE_API_URL, {
            type: "CNAME",
            name: `${subdomain}.nw-api.org`,  // 🔥 생성할 서브도메인
            content: `${tunnelUUID}.cfargotunnel.com`,  // 🔥 Cloudflare Tunnel 주소
            ttl: 1,  // 자동 TTL
            proxied: true  // Cloudflare Proxy 사용
        }, {
            headers: {
                "Authorization": `Bearer ${CLOUDFLARE_API_KEY}`,
                "Content-Type": "application/json"
            }
        });

        if (response.data.success) {
            log.info(`✅ 성공: ${subdomain}.nw-api.org 등록 완료!`);
            return `${subdomain}.nw-api.org`;
        } else {
            log.error("❌ DNS 등록 실패:", response.data.errors);
            return null;
        }
    } catch (error) {
        if (error.response && error.response.data) {
            const errorData = error.response.data;
            log.error("❌ API 요청 오류:", errorData);

            // 🔥 기존 도메인 존재 오류일 경우, 그냥 해당 도메인 리턴
            const existingRecordError = errorData.errors.find(err => err.code === 81053);
            if (existingRecordError) {
                log.info(`⚠️ 이미 존재하는 서브도메인: ${subdomain}.nw-api.org`);
                return `${subdomain}.nw-api.org`;
            }
        }

        log.error("❌ API 요청 중 알 수 없는 오류 발생:", error.message);
        return null;
    }
}

module.exports = {
    createCloudflareSubdomain
}
