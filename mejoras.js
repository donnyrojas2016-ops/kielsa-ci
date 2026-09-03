// mejoras.js - Kielsa CI - Reporte Plan de Trabajo
// Agrega: selector múltiple de auditores + botón PDF
// No modifica app.js ni ningún archivo existente

(function() {
  'use strict';

  function waitFor(selector, maxMs, callback) {
    var start = Date.now();
    var interval = setInterval(function() {
      var el = document.querySelector(selector);
      if (el) { clearInterval(interval); callback(el); }
      else if (Date.now() - start > maxMs) { clearInterval(interval); }
    }, 500);
  }

  function getMes() {
    var inp = document.querySelector('input[type="month"]');
    return inp ? inp.value : '';
  }

  function getPaisId() {
    var sels = document.querySelectorAll('select');
    for (var i = 0; i < sels.length; i++) {
      var opts = sels[i].querySelectorAll('option');
      for (var j = 0; j < opts.length; j++) {
        if (opts[j].text.includes('Honduras') || opts[j].text.includes('Guatemala')) {
          return sels[i].value;
        }
      }
    }
    return '';
  }

  // Wait for the report page to load
  function tryInject() {
    // Find the "Descargar Excel" button in the report section
    var btns = document.querySelectorAll('button');
    var excelBtn = null;
    btns.forEach(function(btn) {
      if (btn.textContent.trim().includes('Descargar Excel') && 
          btn.closest && btn.closest('[class]')) {
        excelBtn = btn;
      }
    });

    if (!excelBtn) return false;
    if (excelBtn.dataset.mejorasInjected) return true;
    excelBtn.dataset.mejorasInjected = '1';

    // Find the auditor select (single) near this button
    var container = excelBtn.parentElement;
    if (!container) return false;

    // Add PDF button next to Excel button
    var pdfBtn = document.createElement('button');
    pdfBtn.type = 'button';
    pdfBtn.innerHTML = '<i class="ti ti-file-type-pdf" style="font-size:15px"></i> PDF';
    pdfBtn.style.cssText = [
      'display:inline-flex', 'align-items:center', 'gap:6px',
      'padding:0.55rem 1.1rem', 'border-radius:8px',
      'background:#dc2626', 'color:#fff', 'cursor:pointer',
      'font-size:13px', 'font-weight:700', 'border:none',
      'white-space:nowrap', 'flex-shrink:0', 'font-family:inherit',
      'box-shadow:0 1px 3px rgba(0,0,0,.18)', 'margin-left:6px'
    ].join(';');

    pdfBtn.addEventListener('click', function() { exportPDF(); });
    excelBtn.parentElement.appendChild(pdfBtn);

    // Upgrade the auditor select to multi-select
    var allSelects = document.querySelectorAll('select');
    allSelects.forEach(function(sel) {
      var hasAllAuditores = false;
      sel.querySelectorAll('option').forEach(function(opt) {
        if (opt.value === '' && opt.text.includes('auditores')) hasAllAuditores = true;
      });
      if (hasAllAuditores && !sel.dataset.mejorasMulti) {
        sel.multiple = true;
        sel.size = 3;
        sel.style.height = '72px';
        sel.style.minWidth = '200px';
        sel.dataset.mejorasMulti = '1';
        sel.title = 'Ctrl+clic para seleccionar varios auditores';
      }
    });

    return true;
  }

  function getSelectedAuditorIds() {
    var ids = [];
    document.querySelectorAll('select[data-mejoras-multi="1"] option:checked').forEach(function(opt) {
      if (opt.value !== '') ids.push(Number(opt.value));
    });
    return ids;
  }

  function exportPDF() {
    if (!window.jspdf) {
      alert('Librería PDF no cargada. Recargue la página.');
      return;
    }

    var mes = getMes();
    if (!mes) { alert('Seleccione un mes primero.'); return; }

    // Get data from the visible table rows
    var rows = [];
    var tabla = document.querySelector('table');
    if (tabla) {
      var trs = tabla.querySelectorAll('tbody tr');
      trs.forEach(function(tr) {
        var tds = tr.querySelectorAll('td');
        if (tds.length >= 5) {
          rows.push({
            auditor: tds[0] ? tds[0].textContent.trim() : '',
            pais: tds[1] ? tds[1].textContent.trim() : '',
            proceso: tds[2] ? tds[2].textContent.trim() : '',
            frecuencia: tds[3] ? tds[3].textContent.trim() : '',
            fecha: tds[4] ? tds[4].textContent.trim() : '',
            estado: tds[5] ? tds[5].textContent.trim() : '',
          });
        }
      });
    }

    // Get KPIs from the visible cards
    var cards = document.querySelectorAll('[style*="grid"]');
    var total = 0, cumplidas = 0, pendientes = 0, pct = 0;
    document.querySelectorAll('div').forEach(function(d) {
      var txt = d.textContent.trim();
      if (d.children.length === 0) {
        var prev = d.previousElementSibling;
        if (prev) {
          var label = prev.textContent.trim();
          if (label === 'Total actividades') total = parseInt(txt) || 0;
          if (label === 'Cumplidas') cumplidas = parseInt(txt) || 0;
          if (label === 'Pendientes') pendientes = parseInt(txt) || 0;
          if (label === '% Cumplimiento') pct = txt;
        }
      }
    });

    try {
      var jsPDF = window.jspdf.jsPDF;
      var doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [254, 190] });
      var pw = 254, ph = 190;

      // Slide 1 - Header
      doc.setFillColor(26, 39, 68);
      doc.rect(0, 0, pw, 38, 'F');
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 38, pw, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Reporte Plan de Trabajo', 14, 22);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Mes: ' + mes + '  |  Generado: ' + new Date().toLocaleDateString('es-HN'), 14, 32);

      // KPI cards
      var kw = (pw - 28) / 4;
      function kpi(x, y, w, h, label, val, r, g, b) {
        doc.setFillColor(r, g, b);
        doc.roundedRect(x, y, w, h, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(String(val), x + w / 2, y + h / 2 + 3, { align: 'center' });
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(label, x + w / 2, y + h - 5, { align: 'center' });
      }

      // Read KPIs from visible page
      var kpiEls = document.querySelectorAll('div');
      var kpiData = { total: '—', cum: '—', pen: '—', pct: '—' };
      kpiEls.forEach(function(el) {
        if (el.children.length === 0 && el.parentElement) {
          var sib = el.parentElement.querySelector('div');
          var parentTxt = el.parentElement.textContent;
          if (parentTxt.includes('Total actividades')) kpiData.total = el.textContent.trim();
          if (parentTxt.includes('Cumplidas') && !parentTxt.includes('Total')) kpiData.cum = el.textContent.trim();
          if (parentTxt.includes('Pendientes')) kpiData.pen = el.textContent.trim();
          if (parentTxt.includes('% Cumplimiento')) kpiData.pct = el.textContent.trim();
        }
      });

      kpi(14, 46, kw - 2, 28, 'Total actividades', kpiData.total, 139, 92, 246);
      kpi(14 + kw, 46, kw - 2, 28, 'Cumplidas', kpiData.cum, 22, 163, 74);
      kpi(14 + kw * 2, 46, kw - 2, 28, 'Pendientes', kpiData.pen, 234, 179, 8);
      kpi(14 + kw * 3, 46, kw - 2, 28, '% Cumplimiento', kpiData.pct, 37, 99, 235);

      // Summary table by auditor
      var y = 82;
      doc.setFillColor(37, 99, 235);
      doc.rect(14, y, pw - 28, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      var cols = ['Auditor', 'Total', 'Cumplidas', 'Pendientes', 'Vencidas', '% Cumpl.'];
      var colX = [14, 90, 120, 148, 178, 208];
      cols.forEach(function(c, i) { doc.text(c, colX[i], y + 5.5); });
      y += 8;

      // Get auditor rows from visible page
      var auditorRows = document.querySelectorAll('table tbody tr');
      var audMap = {};
      auditorRows.forEach(function(tr) {
        var tds = tr.querySelectorAll('td');
        if (tds.length < 3) return;
        var aud = tds[0].textContent.trim();
        var estado = tds[5] ? tds[5].textContent.trim() : '';
        if (!aud) return;
        if (!audMap[aud]) audMap[aud] = { total: 0, cum: 0, pen: 0, ven: 0 };
        audMap[aud].total++;
        if (estado === 'Cumplido') audMap[aud].cum++;
        else if (estado === 'Vencido') audMap[aud].ven++;
        else audMap[aud].pen++;
      });

      Object.keys(audMap).forEach(function(aud, i) {
        var d = audMap[aud];
        var bg = i % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
        doc.setFillColor(bg[0], bg[1], bg[2]);
        doc.rect(14, y, pw - 28, 8, 'F');
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        var pctAud = d.total ? Math.round(d.cum / d.total * 100) + '%' : '0%';
        [aud, String(d.total), String(d.cum), String(d.pen), String(d.ven), pctAud]
          .forEach(function(v, j) { doc.text(v.substring(0, 18), colX[j], y + 5.5); });
        y += 8;
        if (y > ph - 20) { doc.addPage([254, 190], 'landscape'); y = 20; }
      });

      // Slide 2 - Detail
      doc.addPage([254, 190], 'landscape');
      doc.setFillColor(26, 39, 68);
      doc.rect(0, 0, pw, 38, 'F');
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 38, pw, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Detalle de Actividades', 14, 22);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Plan de Trabajo — ' + mes, 14, 32);

      var y2 = 46;
      doc.setFillColor(37, 99, 235);
      doc.rect(14, y2, pw - 28, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      var cols2 = ['Auditor', 'País', 'Proceso', 'Frecuencia', 'Fecha', 'Estado'];
      var colX2 = [14, 55, 90, 175, 200, 222];
      cols2.forEach(function(c, i) { doc.text(c, colX2[i], y2 + 5.5); });
      y2 += 8;

      rows.forEach(function(row, i) {
        if (y2 > ph - 15) {
          doc.addPage([254, 190], 'landscape');
          y2 = 20;
        }
        var bg2 = i % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
        doc.setFillColor(bg2[0], bg2[1], bg2[2]);
        doc.rect(14, y2, pw - 28, 7, 'F');
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text((row.auditor || '').substring(0, 16), colX2[0], y2 + 5);
        doc.text((row.pais || '').substring(0, 12), colX2[1], y2 + 5);
        doc.text((row.proceso || '').substring(0, 34), colX2[2], y2 + 5);
        doc.text((row.frecuencia || '').substring(0, 10), colX2[3], y2 + 5);
        doc.text((row.fecha || '').substring(0, 10), colX2[4], y2 + 5);
        var ec = row.estado === 'Cumplido' ? [22,163,74] : row.estado === 'Vencido' ? [220,38,38] : [234,179,8];
        doc.setTextColor(ec[0], ec[1], ec[2]);
        doc.setFont('helvetica', 'bold');
        doc.text((row.estado || 'Pendiente').substring(0, 10), colX2[5], y2 + 5);
        y2 += 7;
      });

      // Footer on all pages
      var total_pages = doc.getNumberOfPages();
      for (var pg = 1; pg <= total_pages; pg++) {
        doc.setPage(pg);
        doc.setFillColor(26, 39, 68);
        doc.rect(0, ph - 8, pw, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Kielsa Farmacéutica — Control Interno', 14, ph - 2.5);
        doc.text('Página ' + pg + ' de ' + total_pages, pw - 14, ph - 2.5, { align: 'right' });
      }

      doc.save('Reporte_Plan_Trabajo_' + mes + '.pdf');

    } catch (err) {
      alert('Error al generar PDF: ' + err.message);
    }
  }

  // Run injector periodically to handle React re-renders
  var injected = false;
  var observer = new MutationObserver(function() {
    if (!injected || !document.querySelector('button[data-mejoras-injected="1"]')) {
      injected = tryInject();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(function() { tryInject(); }, 2000);
  setTimeout(function() { tryInject(); }, 4000);

})();
