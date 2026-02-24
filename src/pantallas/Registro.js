import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { registrarEmail } from '../servicios/auth';

export default function Registro({ navigation }) {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fotoUri, setFotoUri] = useState(null);
  const [cargando, setCargando] = useState(false);

  const elegirImagen = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso', 'Activa la galería.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!resultado.canceled && resultado.assets[0]) {
      setFotoUri(resultado.assets[0].uri);
    }
  };

  const enviar = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('', 'Email y contraseña.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('', 'Mín. 6 caracteres.');
      return;
    }
    setCargando(true);
    try {
      await registrarEmail(email.trim(), password, {
        nombreCompleto: nombreCompleto.trim(),
        fotoUrl: fotoUri || '',
      });
      navigation.replace('ContenidoGeneral');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.titulo}>Registro</Text>
      <TouchableOpacity style={estilos.contenedorFoto} onPress={elegirImagen}>
        {fotoUri ? (
          <Image source={{ uri: fotoUri }} style={estilos.foto} />
        ) : (
          <Text style={estilos.textoPlaceholderFoto}>+ Imagen</Text>
        )}
      </TouchableOpacity>
      <TextInput
        style={estilos.input}
        placeholder="Nombre completo"
        placeholderTextColor="#666"
        value={nombreCompleto}
        onChangeText={setNombreCompleto}
        autoCapitalize="words"
      />
      <TextInput
        style={estilos.input}
        placeholder="Email"
        placeholderTextColor="#666"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={estilos.input}
        placeholder="Contraseña"
        placeholderTextColor="#666"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity
        style={[estilos.boton, cargando && estilos.botonDeshabilitado]}
        onPress={enviar}
        disabled={cargando}
      >
        {cargando ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={estilos.botonTexto}>Registrarme</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={estilos.enlace}>Atrás</Text>
      </TouchableOpacity>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#0d0d0d', padding: 24, paddingTop: 60 },
  titulo: { fontSize: 24, color: '#fff', marginBottom: 24, textAlign: 'center' },
  contenedorFoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2a2a2a',
    alignSelf: 'center',
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foto: { width: 100, height: 100, borderRadius: 50 },
  textoPlaceholderFoto: { color: '#888', fontSize: 14 },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 14,
    color: '#fff',
    marginBottom: 12,
    fontSize: 16,
  },
  boton: {
    backgroundColor: '#c9a227',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  botonDeshabilitado: { opacity: 0.7 },
  botonTexto: { color: '#000', fontWeight: '600', fontSize: 16 },
  enlace: { color: '#c9a227', textAlign: 'center', fontSize: 14 },
});
