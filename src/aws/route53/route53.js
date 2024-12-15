const AWS = require('aws-sdk');

// Route 53 클라이언트 초기화
const route53 = new AWS.Route53({ region: 'us-east-1' });

// Hosted Zone ID (Route 53에서 확인)
const HOSTED_ZONE_ID = 'Z08177472NK3G3O14NQYL';

async function addSubdomain(subdomain, ipAddress) {
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
        console.log(`Successfully added subdomain: ${subdomain}.narrowroad-model.com`);
        console.log(result);
    } catch (error) {
        console.error(`Failed to add subdomain: ${error.message}`);
    }
}

// 서브 도메인 등록
//addSubdomain('pc1', '192.168.1.10');
