/* Animações da landing page do produto: revelação ao rolar e contadores. */
(function () {
  "use strict";

  var landing = document.querySelector(".uc-landing");
  if (!landing) return;

  var reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!("IntersectionObserver" in window) || reduzir) return;

  document.documentElement.classList.add("js");

  var revelar = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) {
      if (!e.isIntersecting) return;
      var irmaos = Array.prototype.slice.call(e.target.parentNode.children);
      e.target.style.transitionDelay = Math.min(irmaos.indexOf(e.target), 5) * 90 + "ms";
      e.target.classList.add("visivel");
      revelar.unobserve(e.target);
    });
  }, { threshold: 0.15 });
  landing.querySelectorAll(".ld-revela").forEach(function (n) { revelar.observe(n); });

  function contar(n, fim, formatar, duracao) {
    var inicio = performance.now();
    function passo(agora) {
      var t = Math.min(1, (agora - inicio) / duracao);
      var suave = 1 - Math.pow(1 - t, 3);
      n.textContent = formatar(fim * suave);
      if (t < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }

  landing.querySelectorAll("[data-contar]").forEach(function (n) {
    contar(n, parseInt(n.dataset.contar, 10), function (v) { return String(Math.round(v)); }, 1400);
  });

  var dinheiro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  landing.querySelectorAll("[data-dinheiro]").forEach(function (n) {
    contar(n, parseFloat(n.dataset.dinheiro), function (v) { return dinheiro.format(v); }, 1800);
  });
})();
