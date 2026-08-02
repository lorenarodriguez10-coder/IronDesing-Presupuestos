function generarPDF(){
  const p = state.presupuestoActual;
  if(!p){ showToast('Primero calculá el presupuesto'); return; }
  if(!window.jspdf){ showToast('No se pudo cargar el generador de PDF'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 15;
  let y = 18;

  // Recalcular totales (mismos valores que en pantalla)
  const subtotalMateriales = p.items.reduce((s,it)=> s + it.cantidad*it.costoUnit, 0);
  const manoObraPct = p.manoObraPct ?? 100;
  const impuestosPct = p.impuestosPct ?? 34.4;
  const manoObra = subtotalMateriales * (manoObraPct/100);
  const subtotalConManoObra = subtotalMateriales + manoObra;
  const impuestos = subtotalConManoObra * (impuestosPct/100);
  const extrasNetos = p.extrasNetos || [];
  const totalExtrasNetos = extrasNetos.reduce((s,it)=> s + it.monto, 0);
  const total = subtotalConManoObra + impuestos + totalExtrasNetos;

  // --- Encabezado ---
  try{ doc.addImage(LOGO_BASE64, 'JPEG', marginX, y, 22, 22); }catch(e){ console.error('No se pudo insertar el logo', e); }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
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

  y += 28;
  doc.setDrawColor(200,180,150);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 8;

  // --- Datos del cliente ---
  const cli = p.cliente || {};
  if(cli.nombre || cli.telefono || cli.direccion || cli.email){
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
    y += 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(p.nombre, marginX, y);
  y += 7;

  // --- Tabla de materiales ---
  const filas = p.items.map(it => [
    it.nombre.replace('⚠ MATERIAL BORRADO — revisá esta plantilla', 'Material (revisar)'),
    `${it.cantidad} ${it.unidad}`,
    formatMoneyPdf(it.costoUnit),
    formatMoneyPdf(it.cantidad*it.costoUnit),
  ]);

  doc.autoTable({
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['Material', 'Cantidad', 'Costo unit.', 'Subtotal']],
    body: filas,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [40,36,29], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245,241,233] },
    columnStyles: { 1: {halign:'right'}, 2: {halign:'right'}, 3: {halign:'right'} },
  });

  y = doc.lastAutoTable.finalY + 8;

  // --- Totales ---
  const totalesX = pageWidth - marginX;
  doc.setFontSize(9.5);
  const lineaTotal = (label, valor, bold) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(label, totalesX - 55, y);
    doc.text(valor, totalesX, y, { align:'right' });
    y += 5.5;
  };
  lineaTotal('Subtotal materiales', formatMoneyPdf(subtotalMateriales));
  lineaTotal(`Mano de obra (${manoObraPct}%)`, formatMoneyPdf(manoObra));
  lineaTotal('Subtotal con mano de obra', formatMoneyPdf(subtotalConManoObra));
  lineaTotal(`Impuestos (${impuestosPct}%)`, formatMoneyPdf(impuestos));
  if(totalExtrasNetos > 0) lineaTotal('Costos extra netos', formatMoneyPdf(totalExtrasNetos));
  doc.setDrawColor(180,140,90);
  doc.line(totalesX - 70, y, totalesX, y);
  y += 6;
  doc.setFontSize(13);
  lineaTotal('TOTAL', formatMoneyPdf(total), true);

  y += 6;

  // --- Tiempo de fabricación y observaciones ---
  if(p.tiempoFabricacion){
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
    doc.text('Tiempo estimado de fabricación:', marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(p.tiempoFabricacion, marginX + 62, y);
    y += 7;
  }
  if(p.observaciones){
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
    doc.text('Observaciones:', marginX, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const lineas = doc.splitTextToSize(p.observaciones, pageWidth - marginX*2);
    doc.text(lineas, marginX, y);
    y += lineas.length * 5 + 4;
  }

  // --- Pie de página ---
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = Math.max(y + 20, pageHeight - 38);
  doc.setDrawColor(200,180,150);
  doc.line(marginX, footerY - 8, pageWidth - marginX, footerY - 8);
  doc.setFontSize(8.5);
  doc.setTextColor(90,90,90);
  doc.text(`${TALLER_INFO.nombre}  ·  WhatsApp: ${TALLER_INFO.whatsapp}  ·  Instagram: ${TALLER_INFO.instagram}`, marginX, footerY - 2);
  doc.setTextColor(0,0,0);

  doc.setFontSize(9);
  doc.text('_________________________', pageWidth - marginX - 55, footerY + 10);
  doc.text('Firma', pageWidth - marginX - 30, footerY + 15);

  const nombreArchivo = `presupuesto-${p.numero ? formatearNumero(p.numero) : 'borrador'}.pdf`;
  doc.save(nombreArchivo);
}

function formatMoneyPdf(n){
  return '$' + (Math.round((n||0)*100)/100).toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:2});
}
