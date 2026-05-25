// ========== 公用 API 函数 ==========

// 获取客户端真实 IP 和地理位置
async function getClientInfo() {
    try {
        // 使用免费 ipapi.co 服务（无需注册，每天1000次免费）
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return {
            ip: data.ip,
            city: data.city || '未知',
            region: data.region || '未知',
            country: data.country_name || '未知',
            location: `${data.city || ''} ${data.region || ''} ${data.country_name || ''}`.trim() || '未知'
        };
    } catch (error) {
        return { ip: '未知', city: '未知', region: '未知', country: '未知', location: '未知' };
    }
}

// 获取浏览器信息
function getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = '未知';
    let os = '未知';
    
    // 识别浏览器
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('MSIE') || ua.includes('Trident')) browser = 'IE';
    
    // 识别操作系统
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    
    return { browser, os, ua: ua.substring(0, 200) };
}

// 记录访问日志（存到 GitHub 仓库）
async function recordVisit(page, userId = 'anonymous') {
    try {
        const [ipInfo, browserInfo] = await Promise.all([getClientInfo(), getBrowserInfo()]);
        const token = localStorage.getItem('gh_token');
        if (!token) return;
        
        const record = {
            id: Date.now(),
            page: page,
            userId: userId,
            timestamp: new Date().toISOString(),
            ip: ipInfo.ip,
            location: ipInfo.location,
            browser: browserInfo.browser,
            os: browserInfo.os,
            userAgent: browserInfo.ua
        };
        
        // 读取现有日志
        let logs = [];
        try {
            const res = await fetch(`https://api.github.com/repos/yizhijumaogzs/yizhijumaogzs.github.io/contents/data/visits.json`, {
                headers: { 'Authorization': `token ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                logs = JSON.parse(atob(data.content));
            }
        } catch(e) {}
        
        logs.unshift(record); // 最新记录放前面
        // 只保留最近 500 条
        if (logs.length > 500) logs = logs.slice(0, 500);
        
        // 保存
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(logs, null, 2))));
        const url = `https://api.github.com/repos/yizhijumaogzs/yizhijumaogzs.github.io/contents/data/visits.json`;
        let sha = null;
        try {
            const getRes = await fetch(url, { headers: { 'Authorization': `token ${token}` } });
            if (getRes.ok) sha = (await getRes.json()).sha;
        } catch(e) {}
        
        await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' },
            body: JSON.stringify({ message: '记录访问', content, sha, branch: 'main' })
        });
    } catch(e) {
        console.error('记录访问失败:', e);
    }
}

// 获取访问统计数据
async function getVisitStats(token) {
    try {
        const res = await fetch(`https://api.github.com/repos/yizhijumaogzs/yizhijumaogzs.github.io/contents/data/visits.json`, {
            headers: { 'Authorization': `token ${token}` }
        });
        if (!res.ok) return { total: 0, today: 0, last7Days: 0, logs: [] };
        const data = await res.json();
        const logs = JSON.parse(atob(data.content));
        
        const today = new Date().toISOString().slice(0,10);
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        
        const todayCount = logs.filter(l => l.timestamp?.startsWith(today)).length;
        const last7DaysCount = logs.filter(l => new Date(l.timestamp) >= last7Days).length;
        
        return { total: logs.length, today: todayCount, last7Days: last7DaysCount, logs: logs };
    } catch(e) {
        return { total: 0, today: 0, last7Days: 0, logs: [] };
    }
}
