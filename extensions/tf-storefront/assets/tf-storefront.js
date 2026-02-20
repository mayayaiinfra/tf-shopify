// THUNDERFIRE Node Health Widget
// Minimal JS - must not impact Lighthouse by > 10 points
(function() {
  'use strict';

  document.querySelectorAll('.tf-node-health').forEach(function(el) {
    var nodeId = el.dataset.nodeId;
    var apiUrl = el.dataset.apiUrl;
    var refresh = parseInt(el.dataset.refresh, 10) || 30;
    var shop = el.dataset.shop;
    var bar = el.querySelector('.tf-health-fill');
    var status = el.querySelector('.tf-health-status');

    function fetchHealth() {
      var url = apiUrl + '?node_id=' + encodeURIComponent(nodeId) + '&shop=' + encodeURIComponent(shop);

      fetch(url)
        .then(function(r) {
          if (!r.ok) throw new Error('Network error');
          return r.json();
        })
        .then(function(data) {
          var pct = Math.round(data.composite_score || 0);
          bar.style.width = pct + '%';

          // Remove old classes
          bar.classList.remove('tf-good', 'tf-warn', 'tf-crit');

          // Add appropriate class
          if (pct >= 80) {
            bar.classList.add('tf-good');
          } else if (pct >= 50) {
            bar.classList.add('tf-warn');
          } else {
            bar.classList.add('tf-crit');
          }

          status.textContent = data.status || (pct + '% healthy');
        })
        .catch(function(err) {
          console.error('THUNDERFIRE health fetch error:', err);
          status.textContent = 'Unavailable';
        });
    }

    // Initial fetch
    fetchHealth();

    // Set up refresh interval if > 0
    if (refresh > 0) {
      setInterval(fetchHealth, refresh * 1000);
    }
  });
})();
