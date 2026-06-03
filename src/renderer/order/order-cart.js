(function exposeOrderCart(root, factory) {
    const api = factory();

    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }

    root.OrderCart = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createOrderCartApi() {
    function createCartController(dependencies) {
        const {
            getOrderList,
            setOrderList,
            getProducts,
            getIconImage,
            getLimitCount,
            setTotalCount,
            openAlertModal,
            playAudio,
        } = dependencies;

        function getCurrentTotalCount() {
            return getOrderList().reduce((sum, order) => sum + (Number(order.count) || 0), 0);
        }

        function showLimitAlert() {
            const limitCount = getLimitCount();
            return openAlertModal(`${limitCount}개 이상 주문 할 수 없습니다.`);
        }

        function checkAndShowEmptyImage() {
            const orderGrid = document.getElementById("orderGrid");
            const gridImage = getIconImage() || "../../assets/basicImage/가이드.png";

            if (orderGrid.children.length === 0) {
                orderGrid.innerHTML = `
            <div class="empty-image flex items-center justify-center h-full">
                <img src="${gridImage}" alt="No items available" class="w-96 h-auto" />
            </div>
        `;
            }
        }

        function addOrderItem(orderItem) {
            const orderGrid = document.getElementById("orderGrid");
            const emptyImage = orderGrid.querySelector(".empty-image");

            if (emptyImage) {
                emptyImage.remove();
            }

            orderGrid.appendChild(orderItem);
        }

        function updateOrderSummary() {
            const orderList = getOrderList();
            const totalPrice = orderList.reduce(
                (sum, order) => sum + (Number(order.price) * order.count),
                0
            );
            const totalCount = getCurrentTotalCount();

            setTotalCount(totalCount);

            const priceElement = document.getElementById("totalAmt");
            const countElement = document.getElementById("totalCount");

            if (priceElement) {
                priceElement.textContent = `₩   ${totalPrice.toLocaleString()}`;
            }
            if (countElement) {
                countElement.textContent = `${totalCount}개`;
            }
        }

        function updateOrderItemDisplay(order) {
            const orderItem = document.querySelector(`[data-order-id="${order.orderId}"]`);
            if (!orderItem) return;

            const quantitySpan = orderItem.querySelector(".quantity");
            const itemTotalElement = orderItem.querySelector(".item-total");

            if (quantitySpan) {
                quantitySpan.textContent = order.count;
            }
            if (itemTotalElement) {
                itemTotalElement.textContent = (order.count * order.price).toLocaleString();
            }
        }

        function createOrderItemElement(product, orderId, count) {
            const orderItem = document.createElement("div");
            orderItem.className = "order-item bg-black bg-opacity-10 p-2 rounded-lg flex justify-between items-center w-full min-h-24";
            orderItem.setAttribute("data-order-id", orderId);
            orderItem.innerHTML = `
        <div class="w-full flex space-x-4">
            <div class="flex flex-col items-center">
                <img src="${product.image}" alt="${product.name}" class="w-14 h-14 rounded-md">
                <div class="flex items-center space-x-2 mt-2">
                    <button class="prevent-double-click h-6 text-white rounded-lg"
                        onclick="updateItemQuantity(this, -1, '${orderId}')">
                    <img class="h-6" src="../../assets/basicImage/20241208_153430.png" alt="manus" />
                    </button>
                    <span class="quantity h-6 rounded-lg text-center">${count}</span>
                    <button class="prevent-double-click h-6 text-white rounded-lg"
                        onclick="updateItemQuantity(this, 1, '${orderId}')">
                    <img class="h-6" src="../../assets/basicImage/20241208_153438.png" alt="plus" />
                    </button>
                </div>
            </div>
            <div class="flex-1">
                <div class="flex justify-between items-center">
                    <h3 class=" text-xl">${product.name}</h3>
                    <p class="text-gray-600 text-xl ">₩<span class="item-total" data-order-id="${orderId}">${(Number(product.price) * count).toLocaleString()}</span></p>
                </div>
            </div>
            <button class="text-red-500 text-sm h-5" onclick="removeItemFromOrder(this, '${orderId}')">
                <img class="h-6" src="../../assets/basicImage/20241208_154625.png" alt="delete" />
            </button>
        </div>
    `;
            return orderItem;
        }

        async function addItemToOrder(menuId) {
            if (getCurrentTotalCount() >= getLimitCount()) {
                return showLimitAlert();
            }

            const product = getProducts().find(item => item.menuId === menuId);
            if (!product) {
                console.error(`Product not found for menuId: ${menuId}`);
                return;
            }

            playAudio("../../assets/audio/음료를 선택하셨습니다.mp3");

            const orderList = getOrderList();
            const existingOrder = orderList.find(order => order.menuId === product.menuId);

            if (existingOrder) {
                existingOrder.count += 1;
                updateOrderItemDisplay(existingOrder);
                updateOrderSummary();
                return;
            }

            const orderId = `${product.menuId}-${product.userId}`;
            orderList.push({
                orderId,
                userId: product.userId,
                menuId: product.menuId,
                price: Number(product.price),
                item: product.items,
                name: product.name,
                count: 1,
            });

            addOrderItem(createOrderItemElement(product, orderId, 1));
            updateOrderSummary();
        }

        function removeItemFromOrder(button, orderId) {
            const orderList = getOrderList();
            const index = orderList.findIndex(order => order.orderId === orderId);

            if (index > -1) {
                orderList.splice(index, 1);
            }

            const orderItem = button.closest(".order-item");
            if (orderItem) {
                orderItem.remove();
            }

            updateOrderSummary();
            checkAndShowEmptyImage();
        }

        function updateItemQuantity(button, delta, orderId) {
            if (delta > 0 && getCurrentTotalCount() >= getLimitCount()) {
                return showLimitAlert();
            }

            const order = getOrderList().find(item => item.orderId === orderId);
            if (!order) {
                console.error(`Order not found for ID: ${orderId}`);
                return;
            }

            order.count += delta;

            if (order.count < 1) {
                order.count = 1;
                console.warn("Quantity cannot be less than 1");
            }

            const orderItem = button.closest(".order-item");
            if (orderItem) {
                const quantitySpan = orderItem.querySelector(".quantity");
                const itemTotalElement = orderItem.querySelector(`.item-total[data-order-id="${orderId}"]`);

                if (quantitySpan) {
                    quantitySpan.textContent = order.count;
                }
                if (itemTotalElement) {
                    itemTotalElement.textContent = (order.count * order.price).toLocaleString();
                }
            }

            updateOrderSummary();
        }

        function removeAllItem() {
            setOrderList([]);

            const orderGrid = document.getElementById("orderGrid");
            if (orderGrid) {
                orderGrid.innerHTML = "";
            }

            updateOrderSummary();
        }

        async function addItemToOrderWithQty(menuId, quantity = 1) {
            const qty = parseInt(quantity, 10);
            if (!qty || qty < 1) return;

            if (getCurrentTotalCount() + qty > getLimitCount()) {
                return showLimitAlert();
            }

            const product = getProducts().find(item => item.menuId === menuId);
            if (!product) {
                console.error(`Product not found for menuId: ${menuId}`);
                return;
            }
            if (product.empty === "yes") {
                return openAlertModal(`"${product.name}" 는 품절입니다.`);
            }

            const orderList = getOrderList();
            const existingOrder = orderList.find(order => order.menuId === product.menuId);

            if (existingOrder) {
                existingOrder.count = (existingOrder.count || 1) + qty;
                updateOrderItemDisplay(existingOrder);
                updateOrderSummary();
                return;
            }

            playAudio("../../assets/audio/음료를 선택하셨습니다.mp3");

            const orderId = `${product.menuId}-${product.userId}`;
            orderList.push({
                orderId,
                userId: product.userId,
                menuId: product.menuId,
                price: Number(product.price),
                item: product.items,
                name: product.name,
                count: qty,
            });

            addOrderItem(createOrderItemElement(product, orderId, qty));
            updateOrderSummary();
        }

        return {
            checkAndShowEmptyImage,
            addOrderItem,
            addItemToOrder,
            updateOrderSummary,
            removeItemFromOrder,
            updateItemQuantity,
            removeAllItem,
            addItemToOrderWithQty,
        };
    }

    return {
        createCartController,
    };
});
