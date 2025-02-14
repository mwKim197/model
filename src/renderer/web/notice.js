const urlHost = window.location.hostname;
let url = "";
if (window.location.hostname.includes("nw-api.org")) {
    console.log("✅ 현재 도메인은 Cloudflared를 통한 nw-api.org 입니다.");
    url = `https://${urlHost}`
} else {
    url = `http://${urlHost}:3142`
    console.log("❌ 다른 도메인에서 실행 중입니다.");
}

document.addEventListener("DOMContentLoaded", () => {
    const noticeForm = document.getElementById("noticeForm");

    noticeForm.addEventListener("submit", async (event) => {
        event.preventDefault(); // 기본 폼 제출 방지

        // 입력 데이터 가져오기
        const title = document.getElementById("title").value;
        const content = document.getElementById("content").value;
        const startDate = document.getElementById("start-date").value;
        const endDate = document.getElementById("end-date").value;
        const imageFile = document.getElementById("image").files[0];

        // FormData 객체 생성 (파일 업로드 포함)
        const formData = new FormData();
        formData.append("title", title);
        formData.append("content", content);
        formData.append("startDate", startDate);
        formData.append("endDate", endDate);
        formData.append("location", "홈페이지 메인");
        formData.append("author", "관리자"); // 로그인 적용 시 변경 가능
        if (imageFile) {
            formData.append("image", imageFile);
        }

        try {
            const response = await fetch(`${url}/notice`, {
                method: "POST",
                body: formData // JSON이 아니라 FormData 사용 (파일 업로드 포함)
            });

            const result = await response.json();

            if (response.ok) {
                alert("✅ 공지사항 등록 성공!");
                noticeForm.reset(); // 폼 초기화
                window.location.reload(); // 새로고침
            } else {
                alert("❌ 공지 등록 실패: " + result.message);
            }
        } catch (error) {
            console.error("❌ 공지 등록 중 오류 발생:", error);
            alert("❌ 공지 등록 중 오류가 발생했습니다.");
        }
    });
});

function previewImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById("imagePreview").src = e.target.result;
            document.getElementById("previewContainer").classList.remove("hidden");
        };
        reader.readAsDataURL(file);
    }
}