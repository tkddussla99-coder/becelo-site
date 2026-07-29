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

  var menuBtn = document.getElementById('menuBtn');
  var topnav = document.getElementById('topnav');
  if(menuBtn && topnav){
    menuBtn.addEventListener('click', function(){
      var isOpen = topnav.classList.toggle('open');
      menuBtn.classList.toggle('active', isOpen);
      menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    topnav.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        topnav.classList.remove('open');
        menuBtn.classList.remove('active');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
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
