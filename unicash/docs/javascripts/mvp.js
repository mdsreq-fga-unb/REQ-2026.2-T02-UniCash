(function () {
  "use strict";
  var container = document.getElementById("matriz-valor-esforco");
  if (!container) return;
  if (!window.Plotly) {
    container.textContent = "Não foi possível carregar o gráfico. Consulte a planilha de priorização no início desta página.";
    return;
  }
  var csvUrl = new URL("../dados/priorizacao.csv", document.currentScript.src).href;
  // Notas de priorização: fonte única em docs/dados/priorizacao.csv
  // (exportado da planilha; também usado pelo painel e pelas páginas de requisitos).
  fetch(csvUrl).then(function (r) { if (!r.ok) throw new Error("Falha ao carregar as notas"); return r.text(); }).then(function (texto) {
  var D = texto.trim().split(/\r?\n/).slice(1).map(function (linha) {
    var c = linha.split(",");
    return [c[0], c[1], parseFloat(c[2]), parseFloat(c[3])];
  });
  var fmt = function (n) { return n.toFixed(2).replace(".", ","); };
  // cor por célula [valor][esforço]
  var C = {4:{1:"p",2:"m",3:"a",4:"pl"},3:{1:"m",2:"m",3:"a",4:"f"},2:{1:"a",2:"f",3:"f",4:"b"},1:{1:"a",2:"b",3:"b",4:"b"}};
  var COL = {p:"#8fdca3",m:"#cdeed3",a:"#cfe0fb",pl:"#fbe9b0",f:"#ececef",b:"#f6c9c9"};
  var xe = [0.8,1.5,2.5,3.5,4.2], ye = [0.8,1.5,2.5,3.5,4.0], shapes = [];
  for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
    shapes.push({type:"rect",xref:"x",yref:"y",x0:xe[i],x1:xe[i+1],y0:ye[j],y1:ye[j+1],
      fillcolor:COL[C[j+1][i+1]],line:{color:"#fff",width:2},layer:"below"});
  }
  // agrupa requisitos com médias idênticas
  var G = {};
  D.forEach(function (r) {
    var k = r[2].toFixed(3) + "|" + r[3].toFixed(3);
    (G[k] = G[k] || {v:r[2], e:r[3], r:[]}).r.push(r);
  });
  var pts = Object.keys(G).map(function (k) { return G[k]; });
  var trace = {
    type:"scatter", mode:"markers",
    x: pts.map(function (p) { return p.e; }),
    y: pts.map(function (p) { return p.v; }),
    marker:{size:9,color:"#1c1c1e",line:{color:"#fff",width:1}},
    customdata: pts.map(function (p) {
      return p.r.map(function (r) { return "<b>" + r[0] + "</b> " + r[1]; }).join("<br>")
        + "<br><br>Valor: " + fmt(p.v) + " | Esforço: " + fmt(p.e);
    }),
    hovertemplate: "%{customdata}<extra></extra>"
  };
  var notes = pts.map(function (p) {
    var lado = p.v > 3.5 && p.v < 3.9; // linha 3,67: rótulo horizontal, à direita
    return {x:p.e, y:p.v, xref:"x", yref:"y", showarrow:false,
      text: p.r.map(function (r) { return r[0]; }).join(" "),
      font:{size:11,color:"#1c1c1e"},
      textangle: lado ? 0 : -90,
      xanchor: lado ? "left" : "center",
      yanchor: lado ? "middle" : "bottom",
      xshift: lado ? 8 : 0, yshift: lado ? 0 : 8};
  });
  var layout = {
    title:{text:"Valor de Negócio × Esforço Técnico — Unicash",font:{size:25}},
    xaxis:{title:"Esforço técnico (média) →",range:[0.8,4.2],tickvals:[1,2,3,4],zeroline:false,showgrid:false,fixedrange:true},
    yaxis:{title:"Valor de negócio (média) →",range:[0.8,4.0],tickvals:[1,2,3,4],zeroline:false,showgrid:false,fixedrange:true},
    shapes:shapes, annotations:notes, showlegend:false,
    margin:{t:300,r:30,b:70,l:70}, paper_bgcolor:"#fff", plot_bgcolor:"#fff", hovermode:"closest"
  };
  return Plotly.newPlot(container, [trace], layout, {responsive:true, displayModeBar:false});
  }).catch(function () {
    container.textContent = "Não foi possível carregar o gráfico. Consulte a planilha de priorização no início desta página.";
  });
})();
