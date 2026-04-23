import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>
        body, html { 
            margin: 0; padding: 0; width: 100%; height: 100%; 
            overflow: hidden; background-color: #000000; 
            display: flex; align-items: center; justify-content: center;
        }
        canvas { 
            width: 100%; height: 100%; 
            max-width: 100vmin; max-height: 100vmin;
            object-fit: contain; 
            opacity: 0; transition: opacity 1s ease;
        }
    </style>
</head>
<body>
    <canvas id="cobe"></canvas>
    <script type="module">
        import createGlobe from 'https://cdn.skypack.dev/cobe';

        let phi = 0;
        let canvas = document.getElementById("cobe");
        
        const markers = [
            { location: [34.0522, -118.2437], size: 0.05 },
            { location: [40.7128, -74.0060], size: 0.04 },
            { location: [51.5074, -0.1278], size: 0.04 },
            { location: [35.6762, 139.6503], size: 0.05 },
        ];

        function init() {
            let width = canvas.offsetWidth;
            const globe = createGlobe(canvas, {
                devicePixelRatio: 2,
                width: width * 2,
                height: width * 2,
                phi: 0,
                theta: 0.3,
                dark: 1,
                diffuse: 2,
                mapSamples: 16000,
                mapBrightness: 12,
                baseColor: [1, 1, 1],
                markerColor: [1, 0.843, 0],
                glowColor: [1, 0.843, 0],
                markers: markers,
                onRender: (state) => {
                    state.phi = phi;
                    phi += 0.005;
                }
            });
            setTimeout(() => { canvas.style.opacity = '1'; }, 100);
        }

        init();
    </script>
</body>
</html>
`;

export function CobeGlobe({ style }: { style?: any }) {
  return (
    <View style={[styles.container, style]}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        androidLayerType="hardware"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
