/* ============================================================
   lotabin — Services · pencil storyboarding video
   Plays assets/storyboardingTEST.mp4 behind the pencil once the
   pencil lays down (the .svc3-pencil-stage gains .laid, toggled by
   js/pencil-3d.js). Pauses + rewinds when it stands back up.
   ============================================================ */
(function () {
  var stage = document.querySelector('.svc3-pencil-stage');
  var vid = document.getElementById('storyVid');
  if (!stage || !vid) return;

  vid.muted = true;          // required for programmatic autoplay
  vid.playsInline = true;

  var playing = false;
  function sync() {
    var laid = stage.classList.contains('laid');
    if (laid && !playing) {
      playing = true;
      var p = vid.play();
      if (p && p.catch) p.catch(function () { /* autoplay blocked — ignore */ });
    } else if (!laid && playing) {
      playing = false;
      vid.pause();
      try { vid.currentTime = 0; } catch (e) {}
    }
  }

  new MutationObserver(sync).observe(stage, { attributes: true, attributeFilter: ['class'] });
  sync();
})();
