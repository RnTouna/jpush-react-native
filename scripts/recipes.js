/**
 * @typedef {object} Recipe
 * @param {string} pattern
 * @param {string} patch
 */

const defaultContext = {
  appKey: '<Your JPush appKey>'
}

/**
 * @param {object} [ctx]
 * @return {{ [string]: (Recipe|Recipe[]) }}
 */
module.exports = (ctx = defaultContext) => ({
  'android/settings.gradle': {
    pattern: `rootProject.name.*`,
    patch: `
include ':jcore-react-native'
project(':jcore-react-native').projectDir = new File(rootProject.projectDir, '../node_modules/jcore-react-native/android')

include ':jpush-react-native'
project(':jpush-react-native').projectDir = new File(rootProject.projectDir, '../node_modules/jpush-react-native/android')
`
  },

  'android/**/AndroidManifest.xml': {
    pattern: `</activity>`,
    patch: `
    <meta-data
        android:name="JPUSH_CHANNEL"
        android:value="\${APP_CHANNEL}" />
    <meta-data
        android:name="JPUSH_APPKEY"
        android:value="\${JPUSH_APPKEY}" />
`
  },

  'android/**/build.gradle': [
    {
      pattern: 'dependencies {',
      patch: `
    compile project(':jcore-react-native')
    compile project(':jpush-react-native')`
    },
    {
      pattern: `versionName .*`,
      patch: `
        manifestPlaceholders = [
                JPUSH_APPKEY: "${ctx.appKey}",
                APP_CHANNEL : "default"
        ]
`
    }
  ],

  'ios/**/AppDelegate.m': [
    {
      pattern: `#import "AppDelegate.h"`,
      patch: `
#import <RCTJPushModule.h>
#ifdef NSFoundationVersionNumber_iOS_9_x_Max
#import <UserNotifications/UserNotifications.h>
#endif
`
    },
    {
      pattern: `- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{`,
      patch: `
  [JPUSHService setupWithOption:launchOptions appKey:@"${ctx.appKey}"
                        channel:nil apsForProduction:nil];
`
    },
    {
      pattern: `@implementation AppDelegate`,
      patch: `

- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url
  sourceApplication:(NSString *)sourceApplication annotation:(id)annotation
{
  return [RCTLinkingManager application:application openURL:url
                      sourceApplication:sourceApplication annotation:annotation];
}

- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  [JPUSHService registerDeviceToken:deviceToken];
}

- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo
{
  [[NSNotificationCenter defaultCenter] postNotificationName:kJPFDidReceiveRemoteNotification object:userInfo];
}

- (void)application:(UIApplication *)application didReceiveLocalNotification:(UILocalNotification *)notification
{
  [[NSNotificationCenter defaultCenter] postNotificationName:kJPFDidReceiveRemoteNotification object: notification.userInfo];
}

- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)   (UIBackgroundFetchResult))completionHandler
{
  [[NSNotificationCenter defaultCenter] postNotificationName:kJPFDidReceiveRemoteNotification object:userInfo];
}

- (void)jpushNotificationCenter:(UNUserNotificationCenter *)center willPresentNotification:(UNNotification *)notification withCompletionHandler:(void (^)(NSInteger))completionHandler
{
  NSDictionary * userInfo = notification.request.content.userInfo;
  if ([notification.request.trigger isKindOfClass:[UNPushNotificationTrigger class]]) {
    [JPUSHService handleRemoteNotification:userInfo];
    [[NSNotificationCenter defaultCenter] postNotificationName:kJPFDidReceiveRemoteNotification object:userInfo];
  }

  completionHandler(UNNotificationPresentationOptionAlert);
}

- (void)jpushNotificationCenter:(UNUserNotificationCenter *)center didReceiveNotificationResponse:(UNNotificationResponse *)response withCompletionHandler:(void (^)())completionHandler
{
  NSDictionary * userInfo = response.notification.request.content.userInfo;
  if ([response.notification.request.trigger isKindOfClass:[UNPushNotificationTrigger class]]) {
    [JPUSHService handleRemoteNotification:userInfo];
    [[NSNotificationCenter defaultCenter] postNotificationName:kJPFOpenNotification object:userInfo];
  }

  completionHandler();
}
`
    }
  ]
})
