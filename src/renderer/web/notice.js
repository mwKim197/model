const urlHost = window.location.hostname;
let url = "";
if (window.location.hostname.includes("nw-api.org")) {
    console.log("✅ 현재 도메인은 Cloudflared를 통한 nw-api.org 입니다.");
    url = `https://${urlHost}`
} else {
    url = `http://${urlHost}:3142`
    console.log("❌ 다른 도메인에서 실행 중입니다.");
}

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