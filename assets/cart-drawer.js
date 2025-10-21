document.addEventListener('DOMContentLoaded', function () {
	var drawer = document.getElementById('cart-drawer');
	var overlay = document.getElementById('cart-drawer-overlay');
	var closeBtn = document.getElementById('cart-drawer-close');
	var itemsList = document.getElementById('cart-drawer-items');
	var emptyEl = document.getElementById('cart-drawer-empty');
	var subtotalEl = document.getElementById('cart-drawer-subtotal');
	var statusEl = document.getElementById('cart-drawer-status');

	if (!drawer) return;

	function setOpen(open) {
		drawer.setAttribute('aria-hidden', String(!open));
		drawer.dataset.open = open ? 'true' : 'false';
		overlay.hidden = !open;
		overlay.dataset.open = open ? 'true' : 'false';
	}

	function renderCart(cart) {
		// update subtotal
		subtotalEl.textContent = Shopify.formatMoney ? Shopify.formatMoney(cart.total_price) : cart.total_price;

		// update header counter
		var cartIcon = document.querySelector('.header__cart-icon');
		if (cartIcon) {
			var sup = cartIcon.querySelector('sup');
			if (cart.item_count > 0) {
				if (!sup) {
					sup = document.createElement('sup');
					cartIcon.insertBefore(sup, cartIcon.firstChild);
				}
				sup.textContent = cart.item_count;
			} else if (sup) {
				sup.remove();
			}
		}

		// render items
		itemsList.innerHTML = '';
		if (!cart.items || cart.items.length === 0) {
			emptyEl.style.display = 'block';
			return;
		}
		emptyEl.style.display = 'none';

			cart.items.forEach(function (item) {
				var li = document.createElement('li');
				li.className = 'cart-drawer__item';
				li.dataset.key = item.key; // para cambios/removals

				var img = document.createElement('img');
				img.src = item.image || '';
				img.alt = item.title;

				var meta = document.createElement('div');
				meta.className = 'cart-drawer__meta';

				var title = document.createElement('div');
				title.className = 'cart-drawer__title';
				title.textContent = item.title;

				var price = document.createElement('div');
				price.className = 'cart-drawer__price';
				price.textContent = (Shopify.formatMoney ? Shopify.formatMoney(item.line_price) : item.line_price);

				var controls = document.createElement('div');
				controls.className = 'cart-drawer__controls';

				var minus = document.createElement('button');
				minus.type = 'button';
				minus.className = 'cart-drawer__minus';
				minus.textContent = '-';

				var qtyInput = document.createElement('input');
				qtyInput.type = 'number';
				qtyInput.min = 0;
				qtyInput.value = item.quantity;
				qtyInput.dataset.key = item.key;

				var plus = document.createElement('button');
				plus.type = 'button';
				plus.className = 'cart-drawer__plus';
				plus.textContent = '+';

				var removeBtn = document.createElement('button');
				removeBtn.type = 'button';
				removeBtn.className = 'cart-drawer__remove';
				removeBtn.textContent = 'Eliminar';
				removeBtn.dataset.key = item.key;

				controls.appendChild(minus);
				controls.appendChild(qtyInput);
				controls.appendChild(plus);
				controls.appendChild(removeBtn);

				meta.appendChild(title);
				meta.appendChild(controls);
				meta.appendChild(price);

				li.appendChild(img);
				li.appendChild(meta);
				itemsList.appendChild(li);

				// Events
				minus.addEventListener('click', function () {
					var newQty = parseInt(qtyInput.value, 10) - 1;
					if (newQty < 0) newQty = 0;
					qtyInput.value = newQty;
					changeLine(item.key, newQty);
				});

				plus.addEventListener('click', function () {
					var newQty = parseInt(qtyInput.value, 10) + 1;
					qtyInput.value = newQty;
					changeLine(item.key, newQty);
				});

				qtyInput.addEventListener('change', function () {
					var v = parseInt(qtyInput.value, 10);
					if (isNaN(v) || v < 0) v = 0;
					qtyInput.value = v;
					changeLine(item.key, v);
				});

				removeBtn.addEventListener('click', function () {
					changeLine(item.key, 0);
				});
			});
	}

	async function refreshCartDrawer() {
		try {
			var res = await fetch('/cart.js');
			if (!res.ok) throw new Error('Cart fetch failed');
			var cart = await res.json();
			renderCart(cart);
		} catch (e) {
			console.warn('refreshCartDrawer error', e);
			statusEl.textContent = 'No se pudo actualizar el carrito';
		}

			async function changeLine(key, quantity) {
				try {
					var res = await fetch('/cart/change.js', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ id: key, quantity: quantity })
					});
					if (!res.ok) throw new Error('Change line failed');
					await refreshCartDrawer();
					await updateHeaderCount();
				} catch (e) {
					console.warn('changeLine error', e);
				}
			}

			async function clearCart() {
				try {
					var res = await fetch('/cart/clear.js', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' }
					});
					if (!res.ok) throw new Error('Clear cart failed');
					await refreshCartDrawer();
					await updateHeaderCount();
				} catch (e) {
					console.warn('clearCart error', e);
				}
			}

			// small helper to update header counter (reusing card-product's logic would be ideal)
			async function updateHeaderCount() {
				try {
					var res = await fetch('/cart.js');
					if (!res.ok) return;
					var cart = await res.json();
					var cartIcon = document.querySelector('.header__cart-icon');
					if (cartIcon) {
						var sup = cartIcon.querySelector('sup');
						if (cart.item_count > 0) {
							if (!sup) {
								sup = document.createElement('sup');
								cartIcon.insertBefore(sup, cartIcon.firstChild);
							}
							sup.textContent = cart.item_count;
						} else if (sup) {
							sup.remove();
						}
					}
				} catch (e) {
					console.warn('updateHeaderCount error', e);
				}
			}

			// header icon opens drawer on click
			var headerCartIcon = document.querySelector('.header__cart-icon');
			if (headerCartIcon) {
				headerCartIcon.addEventListener('click', function (e) {
					e.preventDefault();
					window.openCartDrawer && window.openCartDrawer();
				});
			}

			// clear button
			var clearBtn = document.getElementById('cart-drawer-clear');
			clearBtn && clearBtn.addEventListener('click', function () {
				if (confirm('¿Vaciar el carrito?')) clearCart();
			});
	}

	function openCartDrawer() {
		setOpen(true);
		drawer.scrollTop = 0;
	}

	function closeCartDrawer() {
		setOpen(false);
	}

	// expose globally so card-product.js can call
	window.refreshCartDrawer = refreshCartDrawer;
	window.openCartDrawer = function () { refreshCartDrawer().then(openCartDrawer); };

	// wire events
	closeBtn && closeBtn.addEventListener('click', closeCartDrawer);
	overlay && overlay.addEventListener('click', closeCartDrawer);

	// close on ESC
	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape' && drawer.dataset.open === 'true') closeCartDrawer();
	});

	// initial refresh to populate drawer
	refreshCartDrawer();
});

