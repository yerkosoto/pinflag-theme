
document.querySelectorAll('.cart-quantity-form').forEach((form) => {
  const decrementBtn = form.querySelector('.quantity-decrement');
  const incrementBtn = form.querySelector('.quantity-increment');
  const quantityInput = form.querySelector('input[name="quantity"]');

  decrementBtn.addEventListener('click', () => {
    let quantity = parseInt(quantityInput.value) || 1;
    if (quantity > 1) {
      quantityInput.value = quantity - 1;
      form.submit();
    }
  });

  incrementBtn.addEventListener('click', () => {
    let quantity = parseInt(quantityInput.value) || 1;
    quantityInput.value = quantity + 1;
    form.submit();
  });

  // Opcional: Enviar el formulario cuando se cambie manualmente el input
  quantityInput.addEventListener('change', () => {
    if (quantityInput.value < 1) {
      quantityInput.value = 1; // Evitar cantidades negativas
    }
    form.submit();
  });
});