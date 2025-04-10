const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Git設定ファイルのパス
const gitConfigPath = path.join(__dirname, '../../../credentials/git_repo_config.json');
const gitConfig = JSON.parse(fs.readFileSync(gitConfigPath, 'utf8'));

const REPO_URL = gitConfig.url;       // 例: https://github.com/ユーザー名/リポジトリ名.git
const USERNAME = gitConfig.username;  // GitHubユーザー名
const TOKEN = gitConfig.password;     // GitHub Personal Access Token

// ディレクトリ指定
const repoDir = path.join(__dirname, 'githubRepository');

function runGitCommand(command, options = {}) {
    console.log(`🔧 実行: git ${command}`);
    execSync(`git ${command}`, { cwd: repoDir, stdio: 'inherit', ...options });
}

(async () => {
    try {
        console.log(`📂 Git初期化対象: ${repoDir}`);

        // 初期化チェック
        if (!fs.existsSync(path.join(repoDir, '.git'))) {
            runGitCommand('init');
        }

        runGitCommand('add .');
        runGitCommand(`commit -m "Initial commit for SAP AI Core prompt templates"`);

        // GitHub用URL（PATを含める形式）
        const secureUrl = REPO_URL.replace(
            'https://',
            `https://${USERNAME}:${TOKEN}@`
        );

        runGitCommand(`remote add origin ${secureUrl}`);
        runGitCommand('branch -M main');
        runGitCommand('push -u origin main');

        console.log('✅ GitHubへの初期化 & プッシュが完了しました！');
    } catch (err) {
        console.error('❌ GitHub初期化・プッシュ中にエラーが発生しました:', err.message);
    }
})();
