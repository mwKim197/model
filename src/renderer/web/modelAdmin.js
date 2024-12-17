const url = window.location.hostname;

document.getElementById('saveItemBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');

    // 메인 메뉴 데이터 수집
    const menuData = {
        no: 0, // 순번 (임시, 나중에 동적으로 변경 가능)
        name: document.getElementById('name').value || '',
        category: document.getElementById('category').value || '',
        price: document.getElementById('price').value || '0',
        cup: document.querySelector('input[name="cup"]:checked')?.value || '',
        iceYn: document.querySelector('input[name="iceYn"]:checked')?.value || '',
        iceTime: document.getElementById('iceTime').value || '0',
        waterTime: document.getElementById('waterTime').value || '0',
        state: {
            new: document.getElementById('new').value || '',
            best: document.getElementById('best').value || '',
            event: document.getElementById('event').value || ''
        },
        items: [],
        image: "https://placehold.co/200x300/png" // 임시 이미지 URL
    };

    // items 데이터 수집
    let itemCounter = 0; // 항목 번호를 위한 카운터
    document.querySelectorAll('#itemContainer fieldset').forEach((fieldset) => {
        itemCounter++;

        const itemType = fieldset.querySelector('select')?.value || '';
        const value1 = fieldset.querySelector('[name*="value1"]')?.value || '0';
        const value2 = fieldset.querySelector('[name*="value2"]')?.value || '0';
        const value3 = fieldset.querySelector('[name*="value3"]')?.value || '0';
        const value4 = fieldset.querySelector('[name*="value4"]')?.value || '0';

        const itemData = {
            no: itemCounter,
            type: itemType,
            value1,
            value2,
            value3,
            value4
        };

        menuData.items.push(itemData); // items 배열에 추가
    });

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('image', file);
        formData.append('menuData', JSON.stringify(menuData));
        console.log(menuData);
        try {
            const response = await fetch(`http://${url}:3000/set-admin-menu-info`, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            if (result.success) {
                console.log('업로드 성공:', result.data);
            } else {
                console.error('업로드 실패:', result.message);
            }
        } catch (error) {
            console.error('업로드 중 오류:', error);
        }
    } else {
        alert('이미지를 선택해주세요.');
    }
});