function calcularTotalesPDF(p){
  const subtotalMateriales = p.items.reduce((s,it)=> s + it.cantidad*it.costoUnit, 0);
  const manoObraPct = p.manoObraPct ?? 100;
  const impuestosPct = p.impuestosPct ?? 34.4;
  const manoObra = subtotalMateriales * (manoObraPct/100);
  const subtotalConManoObra = subtotalMateriales + manoObra;
  const impuestos = subtotalConManoObra * (impuestosPct/100);
  const extrasNetos = p.extrasNetos || [];
  const totalExtrasNetos = extrasNetos.reduce((s,it)=> s + it.monto, 0);
  const total = subtotalConManoObra + impuestos + totalExtrasNetos;
  return { subtotalMateriales, manoObraPct, impuestosPct, manoObra, subtotalConManoObra, impuestos, extrasNetos, totalExtrasNetos, total };
}
function formatMoneyPdf(n){
  return '$' + (Math.round((n||0)*100)/100).toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:2});
}

function dibujarEncabezado(doc, p, marginX, etiqueta){
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;
  try{ doc.addImage(LOGO_BASE64, 'JPEG', marginX, y, 22, 22); }catch(e){ console.error('No se pudo insertar el logo', e); }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0,0,0);
  doc.text(TALLER_INFO.nombre.toUpperCase(), marginX + 27, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110,110,110);
  doc.text('Diseño · Fabricación · Calidad', marginX + 27, y + 15);
  doc.setTextColor(0,0,0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const numeroTexto = p.numero ? `PRESUPUESTO Nº ${formatearNumero(p.numero)}` : 'PRESUPUESTO (BORRADOR)';
  doc.text(numeroTexto, pageWidth - marginX, y + 4, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Fecha de emisión: ${fechaLegible(p.fecha)}`, pageWidth - marginX, y + 10, { align: 'right' });
  doc.text(`Válido por ${TALLER_INFO.validezDias} días`, pageWidth - marginX, y + 15, { align: 'right' });

  if(etiqueta){
    doc.setFontSize(8);
    doc.setTextColor(150,150,150);
    doc.text(etiqueta, marginX, y + 26);
    doc.setTextColor(0,0,0);
  }

  y += 30;
  doc.setDrawColor(200,180,150);
  doc.line(marginX, y, pageWidth - marginX, y);
  return y + 8;
}

function dibujarDatosCliente(doc, p, marginX, y){
  const cli = p.cliente || {};
  if(!(cli.nombre || cli.telefono || cli.direccion || cli.email)) return y;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DATOS DEL CLIENTE', marginX, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  if(cli.nombre){ doc.text(`Nombre: ${cli.nombre}`, marginX, y); y += 5.5; }
  if(cli.telefono){ doc.text(`Teléfono: ${cli.telefono}`, marginX, y); y += 5.5; }
  if(cli.direccion){ doc.text(`Dirección: ${cli.direccion}`, marginX, y); y += 5.5; }
  if(cli.email){ doc.text(`Email: ${cli.email}`, marginX, y); y += 5.5; }
  return y + 4;
}

function dibujarMedidas(doc, p, marginX, y){
  const m = p.medidas || {};
  if(!(m.largo || m.ancho || m.alto)) return y;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110,110,110);
  doc.text(`Medidas: ${m.largo||0}m × ${m.ancho||0}m × ${m.alto||0}m`, marginX, y);
  doc.setTextColor(0,0,0);
  return y + 6;
}

function ensureSpace(doc, y, needed, marginX){
  const pageHeight = doc.internal.pageSize.getHeight();
  if(y + needed > pageHeight - 25){
    doc.addPage();
    return dibujarEncabezado(doc, doc._presupuestoActualPDF, marginX, doc._etiquetaPDF);
  }
  return y;
}

function dibujarPie(doc, p, marginX){
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 22;
  doc.setDrawColor(200,180,150);
  doc.line(marginX, footerY - 8, pageWidth - marginX, footerY - 8);
  doc.setFontSize(8.5);
  doc.setTextColor(90,90,90);
  doc.text(`${TALLER_INFO.nombre}  ·  WhatsApp: ${TALLER_INFO.whatsapp}  ·  Instagram: ${TALLER_INFO.instagram}`, marginX, footerY - 2);
  doc.setTextColor(0,0,0);
  doc.setFontSize(9);
  doc.text('_________________________', pageWidth - marginX - 55, footerY + 6);
  doc.text('Firma', pageWidth - marginX - 30, footerY + 11);
}

function generarPDF(){
  const p = state.presupuestoActual;
  if(!p){ showToast('Primero calculá el presupuesto'); return; }
  if(!window.jspdf){ showToast('No se pudo cargar el generador de PDF'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 15;
  const t = calcularTotalesPDF(p);

  doc._presupuestoActualPDF = p;

  // ============== PÁGINA 1: USO INTERNO (desglose completo) ==============
  doc._etiquetaPDF = 'PÁGINA INTERNA — NO ENVIAR AL CLIENTE';
  let y = dibujarEncabezado(doc, p, marginX, doc._etiquetaPDF);
  y = dibujarDatosCliente(doc, p, marginX, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(p.nombre, marginX, y);
  y += 6;
  y = dibujarMedidas(doc, p, marginX, y);
  y += 1;

  const filas = p.items.map(it => [
    it.nombre.replace('⚠ MATERIAL BORRADO — revisá esta plantilla', 'Material (revisar)'),
    `${it.cantidad} ${it.unidad}`,
    formatMoneyPdf(it.costoUnit),
    formatMoneyPdf(it.cantidad*it.costoUnit),
  ]);

  doc.autoTable({
    startY: y,
    margin: { left: marginX, right: marginX, bottom: 25 },
    head: [['Material', 'Cantidad', 'Costo unit.', 'Subtotal']],
    body: filas,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [40,36,29], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245,241,233] },
    columnStyles: { 1: {halign:'right'}, 2: {halign:'right'}, 3: {halign:'right'} },
    didDrawPage: () => { dibujarPie(doc, p, marginX); },
  });

  y = doc.lastAutoTable.finalY + 8;
  y = ensureSpace(doc, y, 45, marginX);

  const totalesX = pageWidth - marginX;
  doc.setFontSize(9.5);
  const lineaTotal = (label, valor, bold) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 13 : 9.5);
    doc.text(label, totalesX - 82, y);
    doc.text(valor, totalesX, y, { align:'right' });
    y += bold ? 8 : 5.5;
  };
  lineaTotal('Subtotal materiales', formatMoneyPdf(t.subtotalMateriales));
  lineaTotal(`Mano de obra (${t.manoObraPct}%)`, formatMoneyPdf(t.manoObra));
  lineaTotal('Subtotal con mano de obra', formatMoneyPdf(t.subtotalConManoObra));
  lineaTotal(`Impuestos (${t.impuestosPct}%)`, formatMoneyPdf(t.impuestos));
  if(t.totalExtrasNetos > 0) lineaTotal('Costos extra netos', formatMoneyPdf(t.totalExtrasNetos));
  doc.setDrawColor(180,140,90);
  doc.line(totalesX - 82, y, totalesX, y);
  y += 6;
  lineaTotal('TOTAL', formatMoneyPdf(t.total), true);
  y += 4;

  if(p.tiempoFabricacion){
    y = ensureSpace(doc, y, 10, marginX);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
    doc.text('Tiempo estimado de fabricación:', marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(p.tiempoFabricacion, marginX + 62, y);
    y += 7;
  }
  if(p.observaciones){
    const lineas = doc.splitTextToSize(p.observaciones, pageWidth - marginX*2);
    y = ensureSpace(doc, y, 8 + lineas.length*5, marginX);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
    doc.text('Observaciones:', marginX, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(lineas, marginX, y);
  }
  dibujarPie(doc, p, marginX);

  // ============== PÁGINA 2: PARA EL CLIENTE (sin desglose interno) ==============
  doc.addPage();
  doc._etiquetaPDF = null;
  y = dibujarEncabezado(doc, p, marginX, null);
  y = dibujarDatosCliente(doc, p, marginX, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(p.nombre, marginX, y);
  y += 6;
  y = dibujarMedidas(doc, p, marginX, y);
  y += 4;

  doc.autoTable({
    startY: y,
    margin: { left: marginX, right: marginX, bottom: 25 },
    head: [['Descripción', 'Total']],
    body: [[ `Fabricación de: ${p.nombre}`, formatMoneyPdf(t.total) ]],
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [40,36,29], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 1: {halign:'right'} },
  });

  y = doc.lastAutoTable.finalY + 14;
  doc.setDrawColor(180,140,90);
  doc.line(pageWidth - marginX - 80, y, pageWidth - marginX, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(160,100,50);
  doc.text('TOTAL', pageWidth - marginX - 80, y);
  doc.text(formatMoneyPdf(t.total), pageWidth - marginX, y, { align: 'right' });
  doc.setTextColor(0,0,0);
  y += 14;

  if(p.tiempoFabricacion){
    y = ensureSpace(doc, y, 10, marginX);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
    doc.text('Tiempo estimado de fabricación:', marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(p.tiempoFabricacion, marginX + 62, y);
    y += 7;
  }
  if(p.observaciones){
    const lineas = doc.splitTextToSize(p.observaciones, pageWidth - marginX*2);
    y = ensureSpace(doc, y, 8 + lineas.length*5, marginX);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
    doc.text('Observaciones:', marginX, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(lineas, marginX, y);
  }
  dibujarPie(doc, p, marginX);

  const nombreArchivo = `presupuesto-${p.numero ? formatearNumero(p.numero) : 'borrador'}.pdf`;
  doc.save(nombreArchivo);
}
