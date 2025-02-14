document.addEventListener("DOMContentLoaded", () => {
    const noticeList = document.getElementById("noticeList");
    const noNoticeMessage = document.getElementById("noNoticeMessage");
    const searchBtn = document.getElementById("searchBtn");
    const noticeForm = document.getElementById("noticeForm");

    // 🔥 현재 날짜를 KST(한국 표준시)로 변환
    const now = new Date();
    const kstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const today = kstTime.toISOString().split("T")[0]; // YYYY-MM-DD 형식으로 변환

    // 🔥 input[type="date"] 필드의 `min` 값 설정 (오늘 이후 선택 가능)
    document.getElementById("start-date").setAttribute("min", today);
    document.getElementById("end-date").setAttribute("min", today);

    // 🔥 기본값을 오늘 날짜로 설정
    document.getElementById("start-date").value = today;
    document.getElementById("end-date").value = today;

    async function fetchNotices(startDate, endDate) {
        try {
            const response = await fetch(`/notices?startDate=${startDate}&endDate=${endDate}`);
            const result = await response.json();
            noticeList.innerHTML = "";

            if (!result.success || result.data.length === 0) {
                noNoticeMessage.classList.remove("hidden");
                return;
            }
            noNoticeMessage.classList.add("hidden");

            result.data.forEach(notice => {
                const row = document.createElement("tr");
                row.className = "border-b";
                row.innerHTML = `
                    <td class="p-3 border">${notice.title}</td>
                    <td class="p-3 border">${notice.startDate}</td>
                    <td class="p-3 border">${notice.endDate}</td>
                    <td class="p-3 border">${notice.location || "-"}</td>
                    <td class="p-3 border text-center">
                        <button class="delete-btn bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600" 
                                data-notice-id="${notice.noticeId}">
                            삭제
                        </button>
                    </td>
                `;
                noticeList.appendChild(row);
            });

            // 🔥 삭제 버튼 이벤트 추가
            document.querySelectorAll(".delete-btn").forEach(button => {
                button.addEventListener("click", async (event) => {
                    const noticeId = event.target.getAttribute("data-notice-id");
                    if (confirm("정말 삭제하시겠습니까?")) {
                        await deleteNotice(noticeId);
                        const startDate = document.getElementById("filter-start-date").value;
                        const endDate = document.getElementById("filter-end-date").value;
                        fetchNotices(startDate, endDate);
                    }
                });
            });

        } catch (error) {
            console.error("❌ 공지사항 조회 중 오류 발생:", error);
        }
    }

    async function deleteNotice(noticeId) {
        try {
            const response = await fetch(`/notice/${noticeId}`, {
                method: "DELETE",
            });

            const result = await response.json();
            if (result.success) {
                alert("공지사항 삭제 성공!");
            } else {
                alert("공지 삭제 실패: " + result.message);
            }
        } catch (error) {
            console.error("❌ 공지 삭제 중 오류 발생:", error);
        }
    }

    noticeForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(noticeForm);

        try {
            const response = await fetch("/notice", {
                method: "POST",
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                alert("공지사항 등록 성공!");
                noticeForm.reset();

                // 🔥 올바른 변수명 사용
                const startDate = document.getElementById("filter-start-date").value;
                const endDate = document.getElementById("filter-end-date").value;
                fetchNotices(startDate, endDate); // ✅ 수정 완료!
            } else {
                alert("공지 등록 실패: " + result.message);
            }
        } catch (error) {
            console.error("❌ 공지 등록 중 오류 발생:", error);
        }
    });


    searchBtn.addEventListener("click", () => {
        const startDate = document.getElementById("filter-start-date").value;
        const endDate = document.getElementById("filter-end-date").value;
        fetchNotices(startDate, endDate);
    });

    document.getElementById("filter-start-date").value = today;
    document.getElementById("filter-end-date").value = today;

    // 🔥 KST 시간 적용한 상태로 fetch 실행
    fetchNotices(today, today);
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