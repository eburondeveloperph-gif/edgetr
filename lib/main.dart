import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'screens/home_screen.dart';
import 'services/local_voice_pipeline.dart';
import 'utils/constants.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Dark status bar and immersive mobile navigation
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(0xFF0A0A0A),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  runApp(const EdgeTrApp());
}

class EdgeTrApp extends StatelessWidget {
  const EdgeTrApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => LocalVoicePipeline(),
      child: MaterialApp(
        title: AppConstants.appTitle,
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          brightness: Brightness.dark,
          scaffoldBackgroundColor: const Color(0xFF0A0A0A),
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFF1F94FF),
            secondary: Color(0xFF448DFF),
            surface: Color(0xFF13151A),
            background: Color(0xFF0A0A0A),
            error: Color(0xFFFF4600),
          ),
          fontFamily: 'Roboto',
          appBarTheme: const AppBarTheme(
            backgroundColor: Color(0xFF13151A),
            foregroundColor: Colors.white,
            elevation: 0,
          ),
          drawerTheme: const DrawerThemeData(
            backgroundColor: Color(0xFF13151A),
          ),
        ),
        home: const HomeScreen(),
      ),
    );
  }
}
