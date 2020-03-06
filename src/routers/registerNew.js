const express = require('express');

const moment = require('moment-timezone');
const multer = require("multer");
const fs = require('fs');
// const filefilter = (req,file, cb)=>{
//     if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/png'|| file.mimetype === 'image/gif'){
//         cb(null, true);
//     }else {
//         cb(null, false);

//     }
// }
// const storage = multer.diskStorage({
//     destination: function(req, file, cb) {
//         cb(null,'./tmp_uploads/');
//     },
//     filename: function(req, file, cb) {
//         cb(null, new Date().toISOString() + file.originalname);
//     }
// })
// const upload = multer({storage: storage});
const upload = multer({dest: 'tmp_uploads/'});
const db =require(__dirname + '/../db_connect');
const router = express.Router();

const dateFormat = "YYYY-MM-DD";


//register -get顯示新增表單 新的表單

router.get('/registerNew',(req,res)=>{
    res.render('connected_book/registerNew');
});

//register -post顯示新增表單 新的表單

router.post('/registerNew',upload.single("img"),(req,res)=>{
    //1.創造一個物件,以傳遞上船錯誤時顯示的資訊
    const name     = req.body.name;
    const sales_id = req.body.sales_id;
    const password = req.body.password;   
    const mobile   = req.body.mobile;
    const birthday = req.body.birthday;
    const email    = req.body.email;
    const imgName  = req.file.originalname;

    const register = {//註冊許可
        success:false,      
        errormessage:'',
        status_code:0,
        result: {}
    };
    const imgoutput = {
        success:false,
        url:'',
        msg:'沒有上傳檔案',
    };
    //3,抓出資料庫裡面原本就有的賣家資料進行比對看有沒有重複註冊
     //這裡要撈資料庫裡面的資料,後面進行比對
     //4.插入資料庫的語法

    const original_sql = "SELECT * FROM `sales`";
    const sql = `INSERT INTO \`sales\` (\`sales_id\`,\`image\`, \`name\`,\`password\`, \`mobile\`, \`birthday\`, \`email\`, \`created_at\`) 
    VALUES (? ,? ,? , ? , ? , ? , ?, NOW());`;
     db.queryAsync(original_sql)
     .then(r=>{//針對查詢結果進行便利處理
        r.forEach((value,index)=>{
            //把資料庫的資料一一抓出來進行比對
            if(email == value.birthday || sales_id == value.sales_id || name == value.name || password == value.password || imgName  == value.image || mobile == value.mobile){
                register.success = false;
                register.errormessage = '重複資料,請重新輸入註冊資料';
                register.status_code = 500;
                // res.json(register);
            }else{    //2.產生各自的正則驗證規則,並針對資料庫裡面已有的資料進行比對

                const email_pattern =  /^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z]+$/;
                const birthday_pattern = /^\d{4}-\d{1,2}-d{1,2}/;

                

                if(!req.body.name || req.body.length < 2){
                    output.error = "請填寫正確姓名";
                    output.status = 410;
                    return res.json(output);
                    //底下不繼續執行就return
                }

                if(!req.body.email || email_pattern.test(req.body.email)){
                    output.error = '請填寫合法的 email';
                    output.status = 420;
                    return res.json(output);
                }
                if(!req.body.email || birthday_pattern.test(req.body.birthday)){
                    output.error = '請填寫合法的 birthday';
                    output.status = 460;
                    return res.json(output);
                }

                if(req.file && req.file.originalname){
                    switch(req.file.mimetype){//兩個條件都有
                        case 'image/jpeg':
                        case 'image/png':
                        case 'image/gif':
                            //符合以上三種皆可
                            //包含他的路徑req.file.path
                            //直接用相對路徑
                            // fs.rename(req.file.path,newPath:'./public/img/' + req.file.originalname,error=>{});
                            //一班都是用亂數決定黨名uuid套件 npm home uuid v1版本用timestamp決定字串 v3 用namespace v4用random
                            //'./public/img/'nodemon啟動位置:DavidProject + req.file.originalname,
                            // output.success = true;
                            // output.url = '/img/' + req.file.originalname;
                        
                            fs.rename(req.file.path,__dirname + '/../../public/img/' + req.file.originalname,error=>{
                            if(error){
                                    //搬移檔案會顯示錯誤
                                    imgoutput.success = false;
                                    imgoutput.msg = "無法搬動檔案";
                            } else {
                                imgoutput.success = true;
                                imgoutput.url = '/img/' + req.file.originalname;
                                imgoutput.msg = "上傳成功";

                            }
                                res.json(imgoutput);//等他搬完再送資料給前端,不知道搬動狀況如何等他搬完再做回應
                            });

                            break;
                        default://除了jpeg,png,gif以外的檔案進行刪除
                            fs.unlink(req.file.path,error=>{
                                //沒有刪除成功的狀況
                                //在這裡可以針對沒有刪除成功的檔案進行if else判斷處理
                                imgoutput.msg = "不接受這種檔案格式";
                                res.json(imgoutput);

                            });
                    }
                }else{
                    res.json(imgoutput);

                }

                return db.queryAsync(sql , [sales_id,'/img/' + imgName,name,password,mobile,birthday,email])
                        .then(r=>{
                            register.result = r;
                            register.success = true;
                            register.errormessage = '沒有上傳錯誤',
                            register.status_code = 100,
                            console.log('result:', r);
                            return res.json(register);
                        });
               
            }
            // res.json(value)
            // {
            //     "sid": 1,
            //     "sales_id": "A001",
            //     "image": "",
            //     "name": "李小明",
            //     "password": "",
            //     "mobile": "0955413111",
            //     "birthday": "1990-09-12T16:00:00.000Z",
            //     "email": "a33df@123",
            //     "created_at": "2020-02-17T07:40:50.000Z"
            // }
        })
     })
    // .catch(error=>{
    //      console.log(error)
    //      // return res.send(error);
    //      return res.json(register);            
    //  });   

    // const email_pattern = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
   


   
    //4,bluebird傳遞資料
    //[
    //     req.body.sales_id,
    //     '/img/'+ req.file.originalname,
    //     req.body.name,
    //     req.body.password,
    //     req.body.mobile,
    //     req.body.birthday,
    //     req.body.email,
    // ]
          
});

//register -post顯示新增表單 新的表單
module.exports = router;