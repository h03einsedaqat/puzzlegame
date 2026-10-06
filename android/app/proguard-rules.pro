# کوچک‌سازی کد در نسخه انتشار به‌صورت پیش‌فرض خاموش است
# (android/app/build.gradle → enableProguardInReleaseBuilds).
# قواعد زیر برای زمانی است که این گزینه فعال شود.

# کتابخانه‌های بومی که با Reflection شناسایی می‌شوند
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.hermes.** { *; }

# ذخیره‌سازی محلی
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# SVG
-keep class com.horcrux.svg.** { *; }

-dontwarn com.facebook.react.**
