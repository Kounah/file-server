document.addEventListener('DOMContentLoaded', function() {
  let footer = document.querySelector('footer');
  let main = document.querySelector('main');

  console.log(footer, main);

  main.style.marginBottom = footer.getBoundingClientRect().height + 'px';
});