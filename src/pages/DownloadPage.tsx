import { Card } from '../components/Card';
import '../features/download/download.css';

const APK = '/downloads/xiajiao-android-debug.apk';

export function Component() {
  return (
    <section className="download-page">
      <div className="download-hero">
        <div className="download-icon">知</div>
        <div>
          <p className="eyebrow">Android · 自用版</p>
          <h1>学习知途 App</h1>
          <p className="download-lead">
            全屏使用、直接调起相机拍答案、没有浏览器地址栏。网页端更新后，App 内的页面会跟着更新，不需要重新安装。
          </p>
        </div>
      </div>

      <div className="download-grid">
        <Card className="download-card">
          <p className="eyebrow">安装包</p>
          <h2>Android 1.0.0</h2>
          <dl>
            <dt>包名</dt>
            <dd>cn.xuexizhitu.app</dd>
            <dt>适用系统</dt>
            <dd>Android 8.0 及以上</dd>
            <dt>类型</dt>
            <dd>自用测试版 · 直接安装</dd>
          </dl>
          <a className="download-button" href={APK} download>
            下载 Android 安装包
          </a>
          <p className="download-hint">
            如果按钮没有开始下载，<a href={APK}>点这里</a>。
          </p>
        </Card>

        <Card className="download-card">
          <p className="eyebrow">安装步骤</p>
          <h2>第一次安装</h2>
          <ol>
            <li>用 Android 手机打开本页并下载 APK。</li>
            <li>在浏览器下载完成页点安装。</li>
            <li>如果系统提示，允许浏览器或文件管理器“安装未知来源应用”。</li>
            <li>安装后打开「学习知途」，登录即可。</li>
          </ol>
          <p className="download-note">
            后续普通版本更新在 App 内完成，不需要重新安装；只有原生壳变化时才需要下载新的 APK 覆盖安装。
          </p>
        </Card>
      </div>

      <Card className="download-note-card">
        <strong>当前是自用版</strong>
        <p>
          APK 不上应用商店，不经过 Google Play。首次安装需要允许未知来源；后续覆盖安装会保留数据，不需要先卸载旧版本。
        </p>
      </Card>
    </section>
  );
}
