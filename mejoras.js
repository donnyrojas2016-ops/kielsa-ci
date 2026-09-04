// mejoras.js - Kielsa CI - Reporte Plan de Trabajo
// Agrega: selector de auditores con casillas (multi-selección real) + botón PDF + botón PowerPoint
// No modifica app.js ni ningún archivo existente. Se inyecta sobre el DOM ya renderizado por React.

(function() {
  'use strict';

  // ---------------------------------------------------------------------
  // Utilidades comunes
  // ---------------------------------------------------------------------

  function getMes() {
    var inp = document.querySelector('input[type="month"]');
    return inp ? inp.value : '';
  }

  function mesLegible(mes) {
    if (!mes) return '';
    var partes = mes.split('-');
    var nombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    var idx = parseInt(partes[1], 10) - 1;
    return (nombres[idx] || '') + ' ' + partes[0];
  }

  function ensureStyles() {
    if (document.getElementById('mejoras-styles')) return;
    var style = document.createElement('style');
    style.id = 'mejoras-styles';
    style.textContent =
      '.mejoras-auditor-btn{display:inline-flex;align-items:center;gap:6px;padding:0.5rem 0.7rem;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#334155;font-size:12px;font-family:inherit;cursor:pointer;min-width:180px;justify-content:space-between}' +
      '.mejoras-auditor-btn:hover{border-color:#8b5cf6}' +
      '.mejoras-auditor-panel{position:absolute;top:calc(100% + 4px);left:0;z-index:1000;background:#fff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.15);padding:8px;min-width:230px;max-height:280px;overflow-y:auto}' +
      '.mejoras-auditor-actions{display:flex;gap:6px;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid #eef2f7}' +
      '.mejoras-auditor-actions button{flex:1;font-size:11px;padding:4px 6px;border-radius:6px;border:1px solid #cbd5e1;background:#f8fafc;color:#334155;cursor:pointer;font-family:inherit}' +
      '.mejoras-auditor-actions button:hover{background:#eef2f7}' +
      '.mejoras-auditor-item{display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:6px;font-size:12.5px;color:#1e293b;cursor:pointer}' +
      '.mejoras-auditor-item:hover{background:#f1f5f9}' +
      '.mejoras-auditor-item input{margin:0;cursor:pointer}';
    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------------
  // Localizar el widget "Reporte Plan de Trabajo" (ancla: botón Descargar Excel)
  // ---------------------------------------------------------------------

  function findExcelBtn() {
    var btns = document.querySelectorAll('button');
    var found = null;
    btns.forEach(function(btn) {
      if (btn.textContent.trim().indexOf('Descargar Excel') !== -1) found = btn;
    });
    return found;
  }

  function findAuditorSelect() {
    var sels = document.querySelectorAll('select');
    var found = null;
    sels.forEach(function(sel) {
      if (!sel.multiple) return;
      var opts = sel.querySelectorAll('option');
      for (var i = 0; i < opts.length; i++) {
        if (opts[i].value === '' && opts[i].text.trim() === '— Todos —') { found = sel; break; }
      }
    });
    return found;
  }

  function findPaisSelect() {
    var sels = document.querySelectorAll('select');
    var found = null;
    sels.forEach(function(sel) {
      var opts = sel.querySelectorAll('option');
      for (var i = 0; i < opts.length; i++) {
        if (opts[i].text.indexOf('Todos los países') !== -1) { found = sel; break; }
      }
    });
    return found;
  }

  function getReportContainer(excelBtn) {
    var el = excelBtn;
    for (var i = 0; i < 12 && el; i++) {
      if (el.querySelector && el.querySelector('table')) return el;
      el = el.parentElement;
    }
    return document;
  }

  // ---------------------------------------------------------------------
  // Selector de auditores con casillas (multi-selección amigable)
  // ---------------------------------------------------------------------

  function upgradeAuditorSelect(auditorSelect) {
    if (!auditorSelect || auditorSelect.dataset.mejorasPatched) return;
    auditorSelect.dataset.mejorasPatched = '1';
    ensureStyles();

    auditorSelect.style.display = 'none';

    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;display:inline-block;';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mejoras-auditor-btn';

    var panel = document.createElement('div');
    panel.className = 'mejoras-auditor-panel';
    panel.style.display = 'none';

    var actions = document.createElement('div');
    actions.className = 'mejoras-auditor-actions';
    var btnAll = document.createElement('button');
    btnAll.type = 'button';
    btnAll.textContent = 'Todos';
    var btnNone = document.createElement('button');
    btnNone.type = 'button';
    btnNone.textContent = 'Ninguno';
    actions.appendChild(btnAll);
    actions.appendChild(btnNone);
    panel.appendChild(actions);

    var options = Array.prototype.filter.call(auditorSelect.options, function(o) { return o.value !== ''; });
    var checkboxes = options.map(function(opt) {
      var label = document.createElement('label');
      label.className = 'mejoras-auditor-item';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = opt.value;
      cb.checked = opt.selected;
      var span = document.createElement('span');
      span.textContent = opt.text;
      label.appendChild(cb);
      label.appendChild(span);
      panel.appendChild(label);
      cb.addEventListener('change', applySelection);
      return cb;
    });

    function applySelection() {
      var anyChecked = checkboxes.some(function(cb) { return cb.checked; });
      Array.prototype.forEach.call(auditorSelect.options, function(o) {
        if (o.value === '') { o.selected = !anyChecked; return; }
        var cb = checkboxes.filter(function(c) { return c.value === o.value; })[0];
        o.selected = cb ? cb.checked : false;
      });
      auditorSelect.dispatchEvent(new Event('change', { bubbles: true }));
      updateLabel();
    }

    function updateLabel() {
      var checked = checkboxes.filter(function(cb) { return cb.checked; });
      var text;
      if (checked.length === 0 || checked.length === checkboxes.length) {
        text = 'Todos los auditores';
      } else if (checked.length === 1) {
        text = checked[0].parentElement.querySelector('span').textContent;
      } else {
        text = checked.length + ' auditores seleccionados';
      }
      btn.innerHTML = '<i class="ti ti-users" style="font-size:14px"></i><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;text-align:left">' + text + '</span><i class="ti ti-chevron-down" style="font-size:12px"></i>';
    }

    btnAll.addEventListener('click', function() {
      checkboxes.forEach(function(cb) { cb.checked = true; });
      applySelection();
    });
    btnNone.addEventListener('click', function() {
      checkboxes.forEach(function(cb) { cb.checked = false; });
      applySelection();
    });

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
    document.addEventListener('click', function(e) {
      if (!wrap.contains(e.target)) panel.style.display = 'none';
    });

    wrap.appendChild(btn);
    wrap.appendChild(panel);
    auditorSelect.parentElement.insertBefore(wrap, auditorSelect);
    updateLabel();
  }

  function getSelectedAuditorNames(auditorSelect) {
    if (!auditorSelect) return 'Todos';
    var sel = Array.prototype.filter.call(auditorSelect.options, function(o) { return o.selected && o.value !== ''; });
    if (sel.length === 0 || sel.length === auditorSelect.options.length - 1) return 'Todos';
    return sel.map(function(o) { return o.text; }).join(', ');
  }

  function getPaisNombre(paisSelect) {
    if (!paisSelect) return 'Todos';
    var opt = paisSelect.options[paisSelect.selectedIndex];
    return (!opt || opt.value === '') ? 'Todos' : opt.text.trim();
  }

  // ---------------------------------------------------------------------
  // Lectura del reporte visible en pantalla (KPIs + tabla de detalle)
  // ---------------------------------------------------------------------

  function readKpis(container) {
    var data = { total: '0', cum: '0', pen: '0', pct: '0%' };
    container.querySelectorAll('div').forEach(function(el) {
      if (el.children.length === 0 && el.parentElement) {
        var parentTxt = el.parentElement.textContent;
        if (parentTxt.indexOf('TOTAL ACTIVIDADES') !== -1) data.total = el.textContent.trim();
        if (parentTxt.indexOf('CUMPLIDAS') !== -1 && parentTxt.indexOf('TOTAL') === -1) data.cum = el.textContent.trim();
        if (parentTxt.indexOf('PENDIENTES') !== -1) data.pen = el.textContent.trim();
        if (parentTxt.indexOf('% CUMPLIMIENTO') !== -1) data.pct = el.textContent.trim();
      }
    });
    return data;
  }

  function readDetalle(container) {
    var rows = [];
    var tabla = container.querySelector('table');
    if (tabla) {
      tabla.querySelectorAll('tbody tr').forEach(function(tr) {
        var tds = tr.querySelectorAll('td');
        if (tds.length >= 5) {
          rows.push({
            auditor: tds[0] ? tds[0].textContent.trim() : '',
            pais: tds[1] ? tds[1].textContent.trim() : '',
            proceso: tds[2] ? tds[2].textContent.trim() : '',
            frecuencia: tds[3] ? tds[3].textContent.trim() : '',
            fecha: tds[4] ? tds[4].textContent.trim() : '',
            estado: tds[5] ? tds[5].textContent.trim() : 'Pendiente'
          });
        }
      });
    }
    return rows;
  }

  function buildAuditorSummary(rows) {
    var map = {};
    rows.forEach(function(r) {
      if (!r.auditor) return;
      if (!map[r.auditor]) map[r.auditor] = { total: 0, cum: 0, pen: 0, ven: 0 };
      map[r.auditor].total++;
      if (r.estado === 'Cumplido') map[r.auditor].cum++;
      else if (r.estado === 'Vencido') map[r.auditor].ven++;
      else map[r.auditor].pen++;
    });
    return map;
  }

  // ---------------------------------------------------------------------
  // Exportar a PDF (existente)
  // ---------------------------------------------------------------------

  function exportPDF() {
    if (!window.jspdf) { alert('Librería PDF no cargada. Recargue la página.'); return; }
    var mes = getMes();
    if (!mes) { alert('Seleccione un mes primero.'); return; }

    var container = getReportContainer(findExcelBtn());
    var rows = readDetalle(container);
    var kpiData = readKpis(container);
    var audMap = buildAuditorSummary(rows);

    try {
      var jsPDF = window.jspdf.jsPDF;
      var doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [254, 190] });
      var pw = 254, ph = 190;

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

      kpi(14, 46, kw - 2, 28, 'Total actividades', kpiData.total, 139, 92, 246);
      kpi(14 + kw, 46, kw - 2, 28, 'Cumplidas', kpiData.cum, 22, 163, 74);
      kpi(14 + kw * 2, 46, kw - 2, 28, 'Pendientes', kpiData.pen, 234, 179, 8);
      kpi(14 + kw * 3, 46, kw - 2, 28, '% Cumplimiento', kpiData.pct, 37, 99, 235);

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
        if (y2 > ph - 15) { doc.addPage([254, 190], 'landscape'); y2 = 20; }
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

  // ---------------------------------------------------------------------
  // Exportar a PowerPoint (nuevo) — refleja tal cual lo que se ve en pantalla
  // ---------------------------------------------------------------------

  function exportPPTX() {
    if (!window.PptxGenJS) { alert('Librería PowerPoint no cargada. Recargue la página.'); return; }
    var mes = getMes();
    if (!mes) { alert('Seleccione un mes primero.'); return; }

    var excelBtn = findExcelBtn();
    var container = getReportContainer(excelBtn);
    var auditorSelect = findAuditorSelect();
    var paisSelect = findPaisSelect();

    var rows = readDetalle(container);
    var kpiData = readKpis(container);
    var audMap = buildAuditorSummary(rows);
    var auditoresTxt = getSelectedAuditorNames(auditorSelect);
    var paisTxt = getPaisNombre(paisSelect);

    try {
      var pptx = new window.PptxGenJS();
      pptx.defineLayout({ name: 'KIELSA', width: 13.33, height: 7.5 });
      pptx.layout = 'KIELSA';
      pptx.author = 'Kielsa Farmacéutica CI';
      pptx.title = 'Reporte Plan de Trabajo - ' + mes;

      pptx.defineSlideMaster({
        title: 'KIELSA_MASTER',
        background: { color: 'FFFFFF' },
        objects: [
          { rect: { x: 0, y: 7.1, w: 13.33, h: 0.4, fill: { color: '1A2744' } } },
          { text: { text: 'Kielsa Farmacéutica — Control Interno', options: { x: 0.3, y: 7.12, w: 8, h: 0.36, fontSize: 9, color: 'FFFFFF', fontFace: 'Segoe UI' } } }
        ],
        slideNumber: { x: 12.6, y: 7.12, w: 0.5, h: 0.36, fontSize: 9, color: 'FFFFFF' }
      });

      // Slide 1 — Portada
      var s1 = pptx.addSlide({ masterName: 'KIELSA_MASTER' });
      s1.background = { color: '1A2744' };
      s1.addShape('rect', { x: 0, y: 3.55, w: 13.33, h: 0.06, fill: { color: '2563EB' } });
      s1.addText('Reporte Plan de Trabajo', { x: 0.6, y: 2.7, w: 12, h: 0.8, fontSize: 34, bold: true, color: 'FFFFFF', fontFace: 'Segoe UI' });
      s1.addText(mesLegible(mes), { x: 0.6, y: 3.7, w: 12, h: 0.5, fontSize: 16, color: 'C7D2FE', fontFace: 'Segoe UI' });
      s1.addText([
        { text: 'Auditor(es): ', options: { bold: true } },
        { text: auditoresTxt + '\n', options: {} },
        { text: 'País: ', options: { bold: true } },
        { text: paisTxt + '\n', options: {} },
        { text: 'Generado: ', options: { bold: true } },
        { text: new Date().toLocaleDateString('es-HN'), options: {} }
      ], { x: 0.6, y: 4.4, w: 10, h: 1.2, fontSize: 12, color: 'E2E8F0', fontFace: 'Segoe UI', lineSpacing: 20 });

      // Slide 2 — KPIs + resumen por auditor
      var s2 = pptx.addSlide({ masterName: 'KIELSA_MASTER' });
      s2.addText('Resumen del mes', { x: 0.4, y: 0.3, w: 8, h: 0.5, fontSize: 20, bold: true, color: '1A2744', fontFace: 'Segoe UI' });

      var kpis = [
        { l: 'Total actividades', v: kpiData.total, c: '8B5CF6' },
        { l: 'Cumplidas', v: kpiData.cum, c: '16A34A' },
        { l: 'Pendientes', v: kpiData.pen, c: 'EAB308' },
        { l: '% Cumplimiento', v: kpiData.pct, c: '2563EB' }
      ];
      var kw = 3.0, gap = 0.2, kx = 0.4;
      kpis.forEach(function(k) {
        s2.addShape('roundRect', { x: kx, y: 1.0, w: kw, h: 1.1, fill: { color: k.c }, rectRadius: 0.08 });
        s2.addText(String(k.v), { x: kx, y: 1.08, w: kw, h: 0.55, align: 'center', fontSize: 26, bold: true, color: 'FFFFFF', fontFace: 'Segoe UI' });
        s2.addText(k.l, { x: kx, y: 1.6, w: kw, h: 0.35, align: 'center', fontSize: 10, color: 'FFFFFF', fontFace: 'Segoe UI' });
        kx += kw + gap;
      });

      var summaryRows = [[
        { text: 'Auditor', options: { bold: true, color: 'FFFFFF', fill: { color: '2563EB' } } },
        { text: 'Total', options: { bold: true, color: 'FFFFFF', fill: { color: '2563EB' } } },
        { text: 'Cumplidas', options: { bold: true, color: 'FFFFFF', fill: { color: '2563EB' } } },
        { text: 'Pendientes', options: { bold: true, color: 'FFFFFF', fill: { color: '2563EB' } } },
        { text: 'Vencidas', options: { bold: true, color: 'FFFFFF', fill: { color: '2563EB' } } },
        { text: '% Cumpl.', options: { bold: true, color: 'FFFFFF', fill: { color: '2563EB' } } }
      ]];
      var audKeys = Object.keys(audMap);
      if (audKeys.length === 0) {
        summaryRows.push([{ text: 'Sin actividades para el filtro seleccionado', options: { colspan: 6, align: 'center', color: '64748B' } }]);
      } else {
        audKeys.forEach(function(aud) {
          var d = audMap[aud];
          var pctAud = d.total ? Math.round(d.cum / d.total * 100) + '%' : '0%';
          summaryRows.push([aud, String(d.total), String(d.cum), String(d.pen), String(d.ven), pctAud]);
        });
      }
      s2.addTable(summaryRows, { x: 0.4, y: 2.4, w: 12.5, fontSize: 10, fontFace: 'Segoe UI', border: { type: 'solid', color: 'E2E8F0', pt: 0.5 }, autoPage: true, autoPageRepeatHeader: true, autoPageSlideStartY: 0.6, autoPageCharWeight: -1, newSlideStartY: 0.6 });

      // Slide(s) siguientes — Detalle de actividades
      var s3 = pptx.addSlide({ masterName: 'KIELSA_MASTER' });
      s3.addText('Detalle de actividades — ' + mesLegible(mes), { x: 0.4, y: 0.3, w: 10, h: 0.5, fontSize: 18, bold: true, color: '1A2744', fontFace: 'Segoe UI' });

      var detalleRows = [[
        { text: 'Auditor', options: { bold: true, color: 'FFFFFF', fill: { color: '2563EB' } } },
        { text: 'País', options: { bold: true, color: 'FFFFFF', fill: { color: '2563EB' } } },
        { text: 'Proceso', options: { bold: true, color: 'FFFFFF', fill: { color: '2563EB' } } },
        { text: 'Frecuencia', options: { bold: true, color: 'FFFFFF', fill: { color: '2563EB' } } },
        { text: 'Fecha', options: { bold: true, color: 'FFFFFF', fill: { color: '2563EB' } } },
        { text: 'Estado', options: { bold: true, color: 'FFFFFF', fill: { color: '2563EB' } } }
      ]];
      if (rows.length === 0) {
        detalleRows.push([{ text: 'Sin actividades para el filtro seleccionado', options: { colspan: 6, align: 'center', color: '64748B' } }]);
      } else {
        rows.forEach(function(r) {
          var estadoColor = r.estado === 'Cumplido' ? '16A34A' : r.estado === 'Vencido' ? 'DC2626' : 'CA8A04';
          detalleRows.push([
            r.auditor, r.pais, r.proceso, r.frecuencia, r.fecha,
            { text: r.estado || 'Pendiente', options: { color: estadoColor, bold: true } }
          ]);
        });
      }
      s3.addTable(detalleRows, {
        x: 0.4, y: 1.0, w: 12.5, colW: [2.0, 1.3, 4.7, 1.3, 1.4, 1.8],
        fontSize: 9, fontFace: 'Segoe UI', border: { type: 'solid', color: 'E2E8F0', pt: 0.5 },
        autoPage: true, autoPageRepeatHeader: true, autoPageSlideStartY: 0.6, newSlideStartY: 0.6,
        masterName: 'KIELSA_MASTER'
      });

      pptx.writeFile({ fileName: 'Reporte_Plan_Trabajo_' + mes + '.pptx' });
    } catch (err) {
      alert('Error al generar PowerPoint: ' + err.message);
    }
  }

  // ---------------------------------------------------------------------
  // Inyección de botones
  // ---------------------------------------------------------------------

  function addButton(afterEl, label, icon, bg, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = '<i class="ti ' + icon + '" style="font-size:15px"></i> ' + label;
    b.style.cssText = [
      'display:inline-flex', 'align-items:center', 'gap:6px',
      'padding:0.55rem 1.1rem', 'border-radius:8px',
      'background:' + bg, 'color:#fff', 'cursor:pointer',
      'font-size:13px', 'font-weight:700', 'border:none',
      'white-space:nowrap', 'flex-shrink:0', 'font-family:inherit',
      'box-shadow:0 1px 3px rgba(0,0,0,.18)', 'margin-left:6px'
    ].join(';');
    b.addEventListener('click', onClick);
    afterEl.parentElement.appendChild(b);
    return b;
  }

  function tryInject() {
    var excelBtn = findExcelBtn();
    if (!excelBtn) return false;

    if (!excelBtn.dataset.mejorasInjected) {
      excelBtn.dataset.mejorasInjected = '1';
      addButton(excelBtn, 'PDF', 'ti-file-type-pdf', '#dc2626', exportPDF);
      addButton(excelBtn, 'PowerPoint', 'ti-presentation', '#d24726', exportPPTX);
    }

    upgradeAuditorSelect(findAuditorSelect());

    return true;
  }

  var injected = false;
  var observer = new MutationObserver(function() {
    injected = tryInject();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(function() { tryInject(); }, 1500);
  setTimeout(function() { tryInject(); }, 3000);
  setTimeout(function() { tryInject(); }, 5000);

})();
