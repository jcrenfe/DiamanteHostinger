(async () => {
  const firebaseConfig = {
    apiKey: "AIzaSyDNWHYREyyCz8-tXEVrSbCIr0bFa8MrnzU",
    authDomain: "diamante-f70f4.firebaseapp.com",
    projectId: "diamante-f70f4",
    storageBucket: "diamante-f70f4.appspot.com",
    messagingSenderId: "257504398244",
    appId: "1:257504398244:web:65afd7a599dad8434a4f31"
  };

  const { initializeApp, getApps, getApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
  const { getFirestore, doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  const { getStorage, ref, uploadBytes, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  const db = getFirestore(app, "diamante-bd"); 
  const storage = getStorage(app);

  const el = document.querySelector('app-offer-manager');
  if (!el) return console.error('❌ Error: Debes estar en Gestión de Ofertas');
  
  const component = ng.getComponent(el);
  const offersList = component.offerService.offers(); 
  const optimizer = component.imageOptimizer;

  console.log(`🚀 Migrando ${offersList.length} ofertas (DB: diamante-bd)...`);

  let migrados = 0;
  for (const offer of offersList) {
    const path = offer.backgroundImage || offer.imageUrl;
    
    if (path && (path.includes('assets/images/') || path.includes('/assets/images/'))) {
      console.log(`⏳ Procesando: ${offer.title}...`);
      
      try {
        const fullUrl = window.location.origin + '/' + path.replace(/^\//, '');
        const response = await fetch(fullUrl);
        const blob = await response.blob();
        
        const optimizedBlob = await optimizer.optimize(blob, 1600, 0.70);
        
        const fileName = path.split('/').pop().split('.')[0] + `_${Date.now()}.webp`;
        const storageRef = ref(storage, `ofertas/${fileName}`);
        
        await uploadBytes(storageRef, optimizedBlob, { contentType: 'image/webp' });
        const firebaseUrl = await getDownloadURL(storageRef);
        
        await updateDoc(doc(db, 'ofertas', offer.id), { 
           backgroundImage: firebaseUrl,
           imageUrl: firebaseUrl
        });
        
        console.log(`   ✅ Completado: ${offer.title}`);
        migrados++;
      } catch (err) {
        console.error(`   ❌ Error en ${offer.title}:`, err.message);
      }
    }
  }

  console.log(`\n🎉 Fin. ${migrados} ofertas migradas.`);
  component.offerService.loadOffers();
})();
