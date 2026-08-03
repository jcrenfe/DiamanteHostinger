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

  const el = document.querySelector('app-product-manager');
  if (!el) return console.error('❌ Error: Debes estar en Gestión de Productos');
  
  const component = ng.getComponent(el);
  const products = component.products();
  const optimizer = component.imageOptimizer;

  console.log(`🚀 Migrando ${products.length} productos (DB: diamante-bd)...`);

  let migrados = 0;
  for (const prod of products) {
    const path = prod.local_image_path;
    
    if (path && (path.includes('assets/images/') || path.includes('/assets/images/'))) {
      console.log(`⏳ Procesando: ${prod.name}...`);
      
      try {
        const fullUrl = window.location.origin + '/' + path.replace(/^\//, '');
        const response = await fetch(fullUrl);
        const blob = await response.blob();
        
        const optimizedBlob = await optimizer.optimize(blob, 1200, 0.75);
        
        const fileName = path.split('/').pop().split('.')[0] + `_${Date.now()}.webp`;
        const storageRef = ref(storage, `productos/${fileName}`);
        
        await uploadBytes(storageRef, optimizedBlob, { contentType: 'image/webp' });
        const firebaseUrl = await getDownloadURL(storageRef);
        
        await updateDoc(doc(db, 'productos', prod.id), { local_image_path: firebaseUrl });
        
        console.log(`   ✅ Completado: ${prod.name}`);
        migrados++;
      } catch (err) {
        console.error(`   ❌ Error en ${prod.name}:`, err.message);
      }
    }
  }

  console.log(`\n🎉 Fin. ${migrados} productos migrados.`);
  component.loadProducts();
})();
