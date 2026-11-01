import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getFirestore} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {getAuth} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

var firebaseConfig = {
  apiKey: "AIzaSyCSojrLVisJKf4qMSC3wMB2CwAPAm_zFqQ",
  authDomain: "kaba-store.firebaseapp.com",
  projectId: "kaba-store",
  storageBucket: "kaba-store.firebasestorage.app",
  messagingSenderId: "50173999196",
  appId: "1:50173999196:web:40b22efbbe8f1415020e99",
  measurementId: "G-5RKWNXCMLV"
};

var app = initializeApp(firebaseConfig);
export var db = getFirestore(app);
export var auth = getAuth(app);
