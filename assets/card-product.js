// Función para actualizar el contador del carrito
async function updateCartCount() {
  try {
    const response = await fetch("/cart.js", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const cart = await response.json();
    const cartCountElement = document.querySelector(".cart-count");
    if (cartCountElement) {
      cartCountElement.textContent = cart.item_count;
    }
  } catch (error) {
    console.error("Error al actualizar el contador del carrito:", error);
  }
}

// Inicializar el contador al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
});

document.querySelectorAll(".card-product").forEach((card) => {
  // Evitar inicializar el mismo card multiple veces (por recarga parcial o scripts duplicados)
  if (card.dataset.cardProductInit === '1') return;
  card.dataset.cardProductInit = '1';
  // Leer variantes desde JSON
  const variants = JSON.parse(card.querySelector(".variants-data").textContent);
  const addBtn = card.querySelector(".add_to_cart");
  const fastBtn = card.querySelector(".buy_now");
  const priceElement = card.querySelector(".card-price");
  const options = {};

  // Seleccionar valor
  card.querySelectorAll(".option li").forEach((li) => {
    // Ignorar los agotados
    if (li.classList.contains("out-stock")) return;

    li.addEventListener("click", () => {
      const ul = li.closest(".option");
      const index = parseInt(ul.dataset.optionIndex);

      // Limpiar selección previa en este UL
      ul.querySelectorAll("li").forEach((x) => x.classList.remove("active"));
      li.classList.add("active");

      // Guardar selección
      options[index] = li.dataset.value;
      validarSeleccion();
    });
  });

  function validarSeleccion() {
    const optionULs = card.querySelectorAll(".option");
    const values = [];

    // Generar array de valores seleccionados en orden
    optionULs.forEach((ul, i) => {
      const activeLi = ul.querySelector("li.active");
      if (activeLi) {
        values[i] = activeLi.dataset.value;
      }
    });

    // Actualizar disponibilidad de otras opciones
    optionULs.forEach((ul, currentIndex) => {
      const optionValues = ul.querySelectorAll("li");
      optionValues.forEach((li) => {
        const value = li.dataset.value;
        let isAvailable = false;

        // Revisar si hay una variante disponible con este valor y las selecciones actuales
        for (const variant of variants) {
          if (variant.available) {
            let matches = true;

            // Verificar que esta variante coincide con las selecciones actuales (ignorando el índice actual)
            for (let i = 0; i < values.length; i++) {
              if (
                i !== currentIndex &&
                values[i] &&
                variant.options[i] !== values[i]
              ) {
                matches = false;
                break;
              }
            }

            // Verificar si el valor de esta opción está en la variante
            if (matches && variant.options[currentIndex] === value) {
              isAvailable = true;
              break;
            }
          }
        }

        // Actualizar clase out-stock
        if (isAvailable) {
          li.classList.remove("out-stock");
        } else {
          li.classList.add("out-stock");
        }
      });
    });

    // Validar si se puede habilitar el botón y actualizar el precio
    if (values.length === optionULs.length && values.every((v) => v)) {
      // Buscar variante exacta
      const variant = variants.find((v) =>
        v.options.every((opt, i) => opt === values[i])
      );

      if (variant && variant.available) {
        addBtn.disabled = false;
        addBtn.dataset.variantId = variant.id;
        fastBtn.disabled = false;
        fastBtn.dataset.variantId = variant.id;

        // Actualizar precio
        let priceHtml = `${(variant.price / 100).toLocaleString("es-CL", {
          style: "currency",
          currency: "CLP",
        })}`;
        if (
          variant.compare_at_price &&
          variant.compare_at_price > variant.price
        ) {
          priceHtml += ` <span class="compare-at-price"><s>${(
            variant.compare_at_price / 100
          ).toLocaleString("es-CL", {
            style: "currency",
            currency: "CLP",
          })}</s></span>`;
        }
        priceElement.innerHTML = priceHtml;
      } else {
        addBtn.disabled = true;
        addBtn.dataset.variantId = "";
        // Restaurar rango de precios inicial
        restoreInitialPrice();
      }
    } else {
      addBtn.disabled = true;
      addBtn.dataset.variantId = "";
      // Restaurar rango de precios inicial
      restoreInitialPrice();
    }
  }

  function restoreInitialPrice() {
    // Calcular el rango de precios desde las variantes
    const prices = variants.map((v) => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const compareAtPriceMax = Math.max(
      ...variants.map((v) => v.compare_at_price || v.price)
    );

    let priceHtml = "";
    if (minPrice === maxPrice) {
      priceHtml = `${(minPrice / 100).toLocaleString("es-CL", {
        style: "currency",
        currency: "CLP",
      })}`;
      if (compareAtPriceMax > minPrice) {
        priceHtml += ` <span class="compare-at-price"><s>${(
          compareAtPriceMax / 100
        ).toLocaleString("es-CL", {
          style: "currency",
          currency: "CLP",
        })}</s></span>`;
      }
    } else {
      priceHtml = `${(minPrice / 100).toLocaleString("es-CL", {
        style: "currency",
        currency: "CLP",
      })} - ${(maxPrice / 100).toLocaleString("es-CL", {
        style: "currency",
        currency: "CLP",
      })}`;
    }
    priceElement.innerHTML = priceHtml;
  }

  // Evento agregar al carrito
  addBtn.addEventListener("click", async () => {
    const variantId = addBtn.dataset.variantId;
    if (!variantId) return;

    // Evitar solicitudes paralelas
    if (addBtn.dataset.busy === '1') return;
    addBtn.dataset.busy = '1';

    // Cambiar texto a "Agregando..."
    const prevText = addBtn.textContent;
    addBtn.textContent = "Agregando...";
    addBtn.disabled = true; // Deshabilitar mientras se procesa

    try {
      const response = await fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: variantId, quantity: 1 }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        // Log detallado para depuración
        console.error('Add to cart failed', { status: response.status, payload });
        throw new Error(payload && payload.description ? payload.description : 'Error al agregar al carrito');
      }

      // Actualizar contador del carrito
      await updateCartCount();
      // Actualizar el contenido del cart-drawer si la función está disponible
      if (window.refreshCartDrawer) {
        try {
          await window.refreshCartDrawer();
        } catch (e) {
          console.warn('refreshCartDrawer falló:', e);
        }
      }
      // Abrir el drawer si la función existe
      if (window.openCartDrawer) {
        try {
          window.openCartDrawer();
        } catch (e) {
          console.warn('openCartDrawer falló:', e);
        }
      }
      // Mostrar "Producto agregado"
      addBtn.textContent = "Producto agregado";

      // Volver a "Agregar al carrito" después de 3 segundos
      setTimeout(() => {
        addBtn.textContent = prevText || "Agregar al carrito";
        addBtn.disabled = false; // Rehabilitar el botón
        addBtn.dataset.busy = '0';
      }, 2000);
    } catch (error) {
      // En caso de error, restaurar el texto y habilitar el botón
      console.error("Error al agregar al carrito:", error);
      addBtn.textContent = prevText || "Agregar al carrito";
      addBtn.disabled = false;
      addBtn.dataset.busy = '0';
    }
  });

  // Evento comprar ahora
  fastBtn.addEventListener("click", async () => {
    const variantId = fastBtn.dataset.variantId;
    if (!variantId) return;
    // Evitar solicitudes paralelas
    if (fastBtn.dataset.busy === '1') return;
    fastBtn.dataset.busy = '1';

    // Cambiar texto a "Procesando..."
    const prevFastText = fastBtn.textContent;
    fastBtn.textContent = "Procesando...";
    fastBtn.disabled = true;

    try {
      // 1. Limpiar el carrito
      const clearRes = await fetch("/cart/clear.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!clearRes.ok) {
        const payload = await clearRes.json().catch(() => null);
        console.error('Cart clear failed', { status: clearRes.status, payload });
        throw new Error('Error al limpiar el carrito');
      }

      // 2. Agregar el producto seleccionado
      const addResponse = await fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: variantId, quantity: 1 }),
      });

      const addPayload = await addResponse.json().catch(() => null);
      if (!addResponse.ok) {
        console.error('Fast add failed', { status: addResponse.status, addPayload });
        throw new Error(addPayload && addPayload.description ? addPayload.description : 'Error al agregar al carrito');
      }

      // Actualizar contador del carrito
      await updateCartCount();
      // Actualizar el contenido del cart-drawer si la función está disponible
      if (window.refreshCartDrawer) {
        try {
          await window.refreshCartDrawer();
        } catch (e) {
          console.warn('refreshCartDrawer falló:', e);
        }
      }
      // Abrir el drawer si la función existe (antes de ir al checkout)
      if (window.openCartDrawer) {
        try {
          window.openCartDrawer();
        } catch (e) {
          console.warn('openCartDrawer falló:', e);
        }
      }
      // 3. Redirigir al checkout
      window.location.href = "/checkout";
    } catch (error) {
      console.error("Error en comprar ahora:", error);
      fastBtn.textContent = prevFastText || "Comprar ahora";
      fastBtn.disabled = false;
      fastBtn.dataset.busy = '0';
    }
  });
});
