package ir.kalamesaz.game

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "kalamesaz"

  /**
   * react-native-screens وضعیت صفحه‌ها را در Fragment نگه می‌دارد؛ پاس دادن null
   * جلوی بازسازی وضعیت قدیمی توسط سیستم و کرش پس از بازگشت به برنامه را می‌گیرد.
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
