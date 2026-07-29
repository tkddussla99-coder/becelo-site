(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var brands = ['JUNG KWAN JANG','DONGKOOK','CENTELLIAN24','VT COSMETICS','LADOR','TIRTIR',
    'PURITO SEOUL','MULDREAM','FROMBIO','CEROLABS','LABNO','REVCELL','ZVYK','NUEGRAY',
    'NUTRI D-DAY','CEPOLAB','그레인온'];
  var track = document.getElementById('track');
  if(track){
    var html = brands.map(function(b){
      return '<span>'+b+'</span><span style="opacity:.3">·</span>';
    }).join('');
    track.innerHTML = html + html;
  }

  if(!('IntersectionObserver' in window) || reduce){
    document.querySelectorAll('.rv').forEach(function(e){e.classList.add('in');});
    return;
  }

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting) return;
      en.target.classList.add('in');
      io.unobserve(en.target);
    });
  },{threshold:.2});
  document.querySelectorAll('.rv').forEach(function(e){io.observe(e);});

  var cio = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting) return;
      var el = en.target, end = +el.dataset.count,
          sfx = el.dataset.suffix || (el.textContent.indexOf('+')>-1?'+':''),
          t0 = null, dur = 1200;
      function tick(ts){
        if(!t0) t0 = ts;
        var p = Math.min((ts-t0)/dur,1);
        el.textContent = Math.round(end*(1-Math.pow(1-p,3))).toLocaleString('en-US') + sfx;
        if(p<1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      cio.unobserve(el);
    });
  },{threshold:.6});
  document.querySelectorAll('[data-count]').forEach(function(e){cio.observe(e);});
})();
