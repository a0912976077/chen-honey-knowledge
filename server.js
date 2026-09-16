'use strict';

const crypto=require('crypto');
const fs=require('fs');
const path=require('path');
const express=require('express');
const multer=require('multer');
const mammoth=require('mammoth');
const pdf=require('pdf-parse');

const app=express();
const root=__dirname;
const storageRoot=process.env.STORAGE_ROOT||root;
const dataDir=path.join(storageRoot,'data');
const uploadDir=path.join(storageRoot,'uploads');
const dbFile=path.join(dataDir,'knowledge.json');
const port=Number(process.env.PORT||3000);
const adminPassword=process.env.ADMIN_PASSWORD||'7771';
const secret=process.env.SESSION_SECRET||crypto.createHash('sha256').update(adminPassword+'chen-honey-local').digest('hex');
fs.mkdirSync(dataDir,{recursive:true});fs.mkdirSync(uploadDir,{recursive:true});
if(!fs.existsSync(dbFile))fs.writeFileSync(dbFile,'[]','utf8');

app.disable('x-powered-by');
app.use(express.json({limit:'1mb'}));
app.use('/uploads',express.static(uploadDir,{fallthrough:false,index:false,maxAge:'1d'}));

const attempts=new Map();
function safeEqual(a,b){const aa=Buffer.from(String(a));const bb=Buffer.from(String(b));return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb)}
function sign(value){return crypto.createHmac('sha256',secret).update(value).digest('base64url')}
function makeToken(){const payload=Buffer.from(JSON.stringify({exp:Date.now()+8*60*60*1000})).toString('base64url');return payload+'.'+sign(payload)}
function verifyToken(token=''){const [payload,sig]=token.split('.');if(!payload||!sig||!safeEqual(sign(payload),sig))return false;try{return JSON.parse(Buffer.from(payload,'base64url')).exp>Date.now()}catch{return false}}
function requireAdmin(req,res,next){const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');if(!verifyToken(token))return res.status(401).json({error:'請重新登入'});next()}
function readDb(){try{return JSON.parse(fs.readFileSync(dbFile,'utf8'))}catch{return []}}
function writeDb(rows){const temp=dbFile+'.tmp';fs.writeFileSync(temp,JSON.stringify(rows,null,2),'utf8');fs.renameSync(temp,dbFile)}

app.post('/api/login',(req,res)=>{const ip=req.ip;const state=attempts.get(ip)||{count:0,until:0};if(state.until>Date.now())return res.status(429).json({error:'嘗試次數過多，請 15 分鐘後再試'});if(!safeEqual(req.body.password||'',adminPassword)){state.count++;if(state.count>=5){state.count=0;state.until=Date.now()+15*60*1000}attempts.set(ip,state);return res.status(401).json({error:'密碼錯誤'});}attempts.delete(ip);res.json({token:makeToken()})});
app.get('/api/health',(req,res)=>res.json({ok:true}));

app.get('/api/knowledge',(req,res)=>res.json(readDb().map(({storedName,...item})=>item)));

const storage=multer.diskStorage({destination:uploadDir,filename:(req,file,cb)=>{const ext=path.extname(file.originalname).slice(0,16);cb(null,Date.now()+'-'+crypto.randomUUID()+ext)}});
const upload=multer({storage,limits:{fileSize:Number(process.env.MAX_UPLOAD_MB||50)*1024*1024}});
async function extractText(file){const ext=path.extname(file.originalname).toLowerCase();if(['.txt','.md','.csv','.json','.html','.htm','.xml','.log'].includes(ext))return fs.readFileSync(file.path,'utf8');if(ext==='.pdf')return (await pdf(fs.readFileSync(file.path))).text;if(ext==='.docx')return (await mammoth.extractRawText({path:file.path})).value;return ''}

app.post('/api/knowledge',requireAdmin,upload.single('file'),async(req,res,next)=>{try{if(!req.file)return res.status(400).json({error:'請選擇檔案'});const title=(req.body.title||req.file.originalname).trim();const summary=(req.body.summary||'').trim();const keywords=(req.body.keywords||'').split(/[,，、\n]/).map(x=>x.trim()).filter(Boolean);let extracted='';try{extracted=(await extractText(req.file)).replace(/\s+/g,' ').trim().slice(0,30000)}catch(error){console.warn('Text extraction failed:',error.message)}const text=(summary||extracted.slice(0,3000)||`已上傳檔案：${req.file.originalname}`).slice(0,12000);const id=crypto.randomUUID();const item={id,cat:req.body.category||'management',tag:req.body.tag||'後台新增',title,keys:[...new Set([...keywords,...title.split(/\s+/)])],text,source:req.body.source||req.file.originalname,url:'/uploads/'+encodeURIComponent(req.file.filename),fileName:req.file.originalname,mimeType:req.file.mimetype,size:req.file.size,createdAt:new Date().toISOString(),storedName:req.file.filename};const rows=readDb();rows.unshift(item);writeDb(rows);res.status(201).json(item)}catch(error){if(req.file)fs.rm(req.file.path,{force:true},()=>{});next(error)}});

app.delete('/api/knowledge/:id',requireAdmin,(req,res)=>{const rows=readDb();const item=rows.find(x=>x.id===req.params.id);if(!item)return res.status(404).json({error:'找不到資料'});writeDb(rows.filter(x=>x.id!==item.id));if(item.storedName)fs.rm(path.join(uploadDir,path.basename(item.storedName)),{force:true},()=>{});res.status(204).end()});

app.use('/assets',express.static(path.join(root,'assets'),{maxAge:'7d'}));
for(const file of ['index.html','admin.html','styles.css','admin.css','script.js','admin.js','manifest.webmanifest','sw.js'])app.get('/'+file,(req,res)=>res.sendFile(path.join(root,file)));
app.get('/',(req,res)=>res.sendFile(path.join(root,'index.html')));
app.use((error,req,res,next)=>{if(error instanceof multer.MulterError)return res.status(400).json({error:error.code==='LIMIT_FILE_SIZE'?'檔案超過大小限制':error.message});console.error(error);res.status(500).json({error:'伺服器處理失敗'})});
app.listen(port,()=>console.log(`陳家養蜂智庫：http://localhost:${port}`));
