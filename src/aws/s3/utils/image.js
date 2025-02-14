const { s3 } = require('../../aws');
const fs = require('fs');
const path = require('path');
const log = require('../../../logger');
const { getUser } = require('../../../util/store');
const { getBasePath, ensureDirectoryExists } = require('./cacheDirManager');

// 이미지 다운로드 함수
const downloadImageFromS3 = async (bucketName, key) => {
    const cacheDir = getBasePath(); // 안전하게 경로 가져오기
    if (!cacheDir) {
        throw new Error('cacheDir - image 저장경로를 찾을수 없습니다.');
    }
    const fileName = path.basename(key);
    // S3 키를 기반으로 로컬 경로 생성
    const localFilePath = path.join(cacheDir, fileName);

    // 로컬 경로에서 디렉토리 부분 추출
    const localDir = path.dirname(localFilePath);

    // 디렉토리가 없으면 생성
    ensureDirectoryExists(localDir);

    // 로컬 파일이 존재하면 그대로 반환
    if (fs.existsSync(localFilePath)) {
        log.info(`캐시 사용: ${localFilePath}`);
        return localFilePath;
    }

    // S3에서 이미지 다운로드
    const params = { Bucket: bucketName, Key: key };
    try {
        const data = await s3.getObject(params).promise();

        // 로컬에 저장
        fs.writeFileSync(localFilePath, data.Body);
        log.info(`S3에서 다운로드: ${localFilePath}`);
        return localFilePath;
    } catch (err) {
        log.error(`S3에서 이미지 다운로드 실패: ${err.message}`);
        throw err;
    }
};

// 경로키의 전체 이미지다운로드
const downloadAllFromS3WithCache = async (bucketName, prefix) => {
    try {
        const cacheDir = getBasePath(); // 안전하게 경로 가져오기
        if (!cacheDir) {
            throw new Error('cacheDir - image 저장경로를 찾을수 없습니다.');
        }

        // S3에서 prefix로 시작하는 모든 객체 조회
        const params = {
            Bucket: bucketName,
            Prefix: prefix,
        };

        const list = await s3.listObjectsV2(params).promise();

        // 객체 리스트 확인
        if (!list.Contents.length) {
            log.info('S3에 다운로드할 객체가 없습니다.');
            return;
        }

        // 각 객체 다운로드
        for (const item of list.Contents) {
            const key = item.Key; // S3 키
            const fileName = path.basename(key); // 파일 이름 추출
            const localFilePath = path.join(cacheDir, fileName); // 로컬 저장 경로

            // 디렉토리 확인 및 생성
            ensureDirectoryExists(cacheDir);

            if (item.Size === 0) {
                continue; // 파일사이즈가 0이면 건너뜀
            }

            // 로컬 파일이 존재하는 경우 최신 상태인지 확인
            if (fs.existsSync(localFilePath)) {
                const localFileStats = fs.statSync(localFilePath);
                const s3LastModified = new Date(item.LastModified);

                // S3와 로컬 파일 수정 시간을 비교
                if (localFileStats.mtime >= s3LastModified) {
                    log.info(`캐시 사용: ${localFilePath}`);
                    continue; // 최신 파일이면 다운로드 건너뜀
                }
            }

            // S3에서 객체 다운로드
            const objectData = await s3.getObject({ Bucket: bucketName, Key: key }).promise();
            fs.writeFileSync(localFilePath, objectData.Body);
            log.info(`S3에서 다운로드: ${localFilePath}`);
        }
    } catch (err) {
        log.error(`S3에서 객체 다운로드 실패: ${err.message}`);
    }
};

// 로컬 업로드 및 S3 저장
const uploadImageToS3andLocal = async (bucketName, buffer, originalFileName, menuId) => {
    const userInfo = await getUser(); // 사용자 정보 가져오기
    const fileName = `${menuId}_${originalFileName}`; // 파일명: menuId + 원본 파일명
    const s3Key = `model/${userInfo.userId}/${fileName}`; // S3 키
    const cacheDir = getBasePath(); // 안전하게 경로 가져오기

    try {
        if (!cacheDir) {
            throw new Error('cacheDir - image 저장경로를 찾을수 없습니다.');
        }
        // 1. 파일 경로 생성 (cacheDir 디렉토리에 파일 저장)
        const localFilePath = path.join(cacheDir, fileName);

        log.info("localFilePath: ", localFilePath);

        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
            log.info("디렉토리 생성 완료:", cacheDir);
        }

        // 2. 로컬 저장
        fs.writeFileSync(localFilePath, buffer);
        log.info("로컬 저장 완료:", localFilePath);

        // 3. S3 업로드
        const params = {
            Bucket: bucketName,
            Key: s3Key,
            Body: buffer,
            ContentType: "image/jpeg", // 적절한 ContentType 지정
        };
        const uploadResult = await s3.upload(params).promise();
        log.info("S3 업로드 완료:", uploadResult.Location);

        // 결과 반환
        return { s3Url: uploadResult.Location, localPath: localFilePath, fileName };
    } catch (error) {
        log.error("이미지 업로드 실패:", error.message);
        throw error;
    }
};

// 로컬 삭제 및 DB 이미지 삭제
const deleteImageFromS3andLocal = async (bucketName, fileName, userId) => {
    const s3Key = `model/${userId}/${fileName}`; // S3에서의 파일 경로
    const cacheDir = getBasePath(); // 로컬 저장 경로
    const localFilePath = path.join(cacheDir, fileName); // 로컬에서의 파일 경로

    try {
        // 1. 로컬 파일 삭제
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
            log.info("로컬 파일 삭제 완료:", localFilePath);
        } else {
            log.info("로컬 파일이 존재하지 않습니다:", localFilePath);
        }

        // 2. S3 파일 삭제
        const s3Params = {
            Bucket: bucketName,
            Key: s3Key,
        };

        await s3.deleteObject(s3Params).promise();
        log.info("S3 파일 삭제 완료:", s3Key);

        return { success: true, message: "이미지 삭제 완료" };
    } catch (error) {
        log.error("이미지 삭제 실패:", error.message);
        throw new Error("이미지 삭제 중 오류 발생");
    }
};

// S3 업로드 함수
const uploadImageToS3 = async (bucketName, s3Key) => {
    try {
        const cacheDir = getBasePath(); // 안전하게 경로 가져오기
        if (!cacheDir) {
            throw new Error('cacheDir - image 저장경로를 찾을수 없습니다.');
        }

        // 파일 읽기
        const fileContent = fs.readFileSync(cacheDir);

        // S3 업로드 매개변수
        const params = {
            Bucket: bucketName,       // S3 버킷 이름
            Key: s3Key,              // S3에 저장될 키 (경로 포함 가능)
            Body: fileContent,       // 파일 내용
            ContentType: 'image/jpeg', // 파일 타입 설정 (필요시 변경)
            ACL: 'public-read',       // 접근 권한 (예: public-read, private 등)
        };

        // S3에 업로드
        const result = await s3.upload(params).promise();
        log.info(`파일 업로드 성공: ${result.Location}`);
        return result.Location; // 업로드된 파일의 URL 반환
    } catch (err) {
        log.error(`S3 업로드 실패: ${err.message}`);
        throw err;
    }
};

// notice S3 저장
const uploadNoticeImageToS3 = async (bucketName, buffer, originalFileName, menuId) => {
    const fileName = `${menuId}_${originalFileName}`; // 파일명: menuId + 원본 파일명
    const s3Key = `model/notice/${fileName}`; // S3 키
    const cacheDir = getBasePath(); // 안전하게 경로 가져오기

    if (!cacheDir) {
        throw new Error('cacheDir - image 저장경로를 찾을수 없습니다.');
    }

    const localFilePath = path.join(cacheDir, fileName); // 로컬 저장 경로

    try {
        // S3 업로드
        const params = {
            Bucket: bucketName,
            Key: s3Key,
            Body: buffer,
            ContentType: "image/jpeg", // 적절한 ContentType 지정
        };
        const uploadResult = await s3.upload(params).promise();
        log.info("S3 업로드 완료:", uploadResult.Location);

        // 결과 반환
        return { s3Url: uploadResult.Location, localPath: localFilePath, fileName };
    } catch (error) {
        log.error("이미지 업로드 실패:", error.message);
        throw error;
    }
};

/**
 * 📌 특정 디렉토리에서 `notice-`로 시작하는 모든 파일 삭제
 */
const deleteNoticeFiles = () => {
    try {
        const cacheDir = getBasePath(); // 안전하게 경로 가져오기

        if (!fs.existsSync(cacheDir)) {
            log.info("❌ 지정된 디렉토리가 존재하지 않습니다:", cacheDir);
            return;
        }

        // 🔥 1️⃣ 디렉토리에서 모든 파일 목록 가져오기
        const files = fs.readdirSync(cacheDir);

        // 🔥 2️⃣ `notice-`로 시작하는 파일만 필터링
        const noticeFiles = files.filter(file => file.startsWith("notice-"));

        if (noticeFiles.length === 0) {
            log.info("✅ 삭제할 공지사항 파일이 없습니다.");
            return;
        }

        // 🔥 3️⃣ 해당 파일들 삭제
        noticeFiles.forEach(file => {
            const filePath = path.join(cacheDir, file);
            fs.unlinkSync(filePath);
            log.info("🗑️ 삭제 완료:", filePath);
        });

        log.info(`✅ 총 ${noticeFiles.length}개의 공지사항 파일 삭제 완료!`);
    } catch (error) {
        log.error("❌ 공지사항 파일 삭제 중 오류 발생:", error);
    }
};

module.exports = {
    downloadImageFromS3,
    downloadAllFromS3WithCache,
    uploadImageToS3andLocal,
    deleteImageFromS3andLocal,
    uploadImageToS3,
    uploadNoticeImageToS3,
    deleteNoticeFiles
};
