document.addEventListener('DOMContentLoaded', function() {
  Array.prototype.slice.call(document.querySelectorAll('iframe')).forEach(iframe => {
    var f = function() {
      let body = iframe.contentDocument.querySelector('body');
      if(body.style.height === '100%') body.style.height = 'auto';
      console.log(body);
      // iframe.style.height = body.getBoundingClientRect().height + 'px';
    };
     
    iframe.onload = f;

    f();
  });
});