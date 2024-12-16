const AWS = require('aws-sdk');
const log = require('../../logger');

// Route 53 클라이언트 초기화
const route53 = new AWS.Route53({ region: 'us-east-1' });

// Hosted Zone ID (Route 53에서 확인)
const HOSTED_ZONE_ID = 'Z08177472NK3G3O14NQYL';

const addSubdomain = async (subdomain, ipAddress)  =>{
    const params = {
        HostedZoneId: HOSTED_ZONE_ID,
        ChangeBatch: {
            Changes: [
                {
                    Action: 'UPSERT', // 업데이트 또는 생성
                    ResourceRecordSet: {
                        Name: `${subdomain}.narrowroad-model.com`,
                        Type: 'A',
                        TTL: 300, // 5분 캐시
                        ResourceRecords: [
                            { Value: ipAddress }
                        ]
                    }
                }
            ]
        }
    };

    try {
        const result = await route53.changeResourceRecordSets(params).promise();
        const url = `${subdomain}.narrowroad-model.com`;
        log.info(`서브도메인 등록 완료: ${url}`);
        log.info(result);
        return url;
    } catch (error) {
        log.error(`Failed to add subdomain: ${error.message}`);
    }
}

// 중복도메인 확인
const checkSubdomainExists = async (subdomain) => {
    const params = {
        HostedZoneId: HOSTED_ZONE_ID
    };

    try {
        const data = await route53.listResourceRecordSets(params).promise();
        const existingRecord = data.ResourceRecordSets.find(
            (record) => record.Name === `${subdomain}.narrowroad-model.com.` && record.Type === 'A'
        );

        if (existingRecord) {
            log.info(`Subdomain already exists: ${subdomain}.narrowroad-model.com`);
            return true;
        } else {
            log.info(`Subdomain is available: ${subdomain}.narrowroad-model.com`);
            return false;
        }
    } catch (error) {
        log.error(`이미 등록된 서브 도메인입니다. : ${error.message}`);
        return false;
    }
};

// 서브도메인 중복확인후 저장처리
const addSubdomainSafely = async (subdomain, ipAddress) => {
    const exists = await checkSubdomainExists(subdomain);
    if (exists) {
        log.info('Subdomain already exists. Updating...');
    } else {
        log.info('Subdomain does not exist. Creating...');
    }

    await addSubdomain(subdomain, ipAddress);
};


module.exports = {
    addSubdomain,
    checkSubdomainExists,
    addSubdomainSafely
};

