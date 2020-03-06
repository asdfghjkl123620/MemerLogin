const express = require('express');
const moment = require('moment-timezone');
const multer = require("multer");
const upload = multer({dest: 'tmp_uploads/'});
const fs = require('fs');

const db = require(__dirname + '/../db_connect');
const router = express.Router();

const dateFormat = "YYYY-MM-DD";



router.get('/edit/:sid',(req,res)=>{
    const sql = "select * from `sales` where sid=?";
    db.queryAsync(sql,[req.params.sid])
    .then(result=>{
        if(!result || !result.length) {
            //沒有資料狀況
            res.redirect(req.baseUrl);
        } else {
            result[0].birthday = moment(result[0].birthday).format(dateFormat);
            res.render('connected_book/edit', {
                row: result[0],
                url: req.baseUrl + req.url,
            });
        }
    })
    .catch(error=>{
        res.redirect(req.baseUrl);
    })
});


router.post('/edit/:sid',upload.single("img"),(req,res)=>{
    let update_sql = `update \`sales\`
                    set sales_id = ?,
                        name = ?,
                        mobile = ?,
                        birthday = ?,
                        email = ? `;
    const output = {
        success:false,
        error:'',
        status:0,
        body:req.body,
        result: {}
    };
    //2.產生各自的正則驗證規則
    // const email_pattern = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
    const birthday_pattern = /^\d{4}-\d{1,2}-d{1,2}/;
    if(!req.body.name || req.body.length < 2){
        output.error = "請填寫正確姓名";
        output.status = 410;
        return res.json(output);
        //底下不繼續執行就return
    }

    // if(!req.body.email || email_pattern.test(req.body.email)){
    //     output.error = '請填寫合法的 email';
    //     output.status = 420;
    //     return res.json(output);
    // }
    if(!req.body.email || birthday_pattern.test(req.body.birthday)){
        output.error = '請填寫合法的 birthday';
        output.status = 460;
        return res.json(output);
    }
    let sql_update_Param = [
        req.body.sales_id,
        req.body.name,
        req.body.mobile,
        req.body.birthday,
        req.body.email,
    ];
    if( req.file && req.file.originalname ){
        let imgFileName = 'S' + moment(new Date()).format('YYYYMMDDHHmmss') + '.' + req.file.originalname.split('.')[1];
        fs.rename(req.file.path, './public/img/'+ imgFileName,()=>{});
        update_sql += `,image = ? where sid = ?`;
        console.log(update_sql);
        sql_update_Param.push(imgFileName,req.body.sid);
    } else {
        update_sql += `where sid = ?`;
        console.log(update_sql);

        sql_update_Param.push(req.params.sid);


    }
    console.log(update_sql);
    db.queryAsync(update_sql,sql_update_Param)
    .then(r=>{
        output.result = r;
        output.success = true;
        console.log('result:',r);
        res.redirect('/connected_book/1');

    }) 
    .catch(error=>{
        console.log(error)
        // return res.send(error);
        return res.json(output);            
    });     
});
router.get('/insert',(req,res)=>{
    res.render('connected_book/insert');
});

router.post('/insert',upload.single("img"),(req,res)=>{
    const output = {
        success:false,
        error:'',
        status:0,
        body:req.body,
        result: {}
    };

    let imgFileName;
    if ( req.file && req.file.originalname ) {
        imgFileName = 'S' + moment(new Date()).format('YYYYMMDDHHmmss') + "." +req.file.originalname.split('.')[1]
        fs.rename(req.file.path, './public/img/'+ imgFileName,()=>{}) 
    } else {
        imgFileName = 'noImg.jpg'
    }

    const insert_sql = `INSERT INTO \`sales\` (\`sales_id\`,\`image\`, \`name\`, \`mobile\`, \`birthday\`, \`email\`, \`created_at\`) 
    VALUES (? , ? , ? , ? , ? , ?, NOW());`;

    const insert_sql_Params = [
        req.body.sales_id,
        imgFileName,
        req.body.name,
        req.body.mobile,
        req.body.birthday,
        req.body.email
    ];
    db.queryAsync(insert_sql,insert_sql_Params)
    .then(r=>{
        //可以針對affectrow進行驗證affectrow<1,傳過來是沒有資料的
        output.result = r;
        output.success = true;
        console.log('result:', r);
        return res.json( output);
    })
    .catch(error=>{
        console.log(error)
        // return res.send(error);
        return res.json(output);            
    });            
});

router.get('/del/:sid',(req,res)=>{

    // if ( req.session.userAccess !=='1' ) {
    //     res.redirect('/connected_book/1')
    // }

    const sql = `DELETE FROM sales WHERE sid = ${req.params.sid}`
    db.query(sql,(error,result)=>{
        if (error) console.log(error)
        res.redirect('/connected_book/1')
    })
})
router.get('/:page',(req,res)=>{
    //每頁有幾筆資料
    const perPage = 6;
    //totalPages總頁數 totalRows總資料筆數
    let totalRows,totalPages;
    //拿到從前端而來的,儲存在params裡面的自訂義參數page
    //做parseInt轉換成整數,沒有的話就是1
    let page = req.params.page ? parseInt(req.params.page) : 1;
    //拿到客戶端請求參數
    // console.log(req.params);
//    res.json(req.baseUrl);
    //連接資料庫的sql語法
    const sql_num = "select count(1) as num from `sales`";

    db.queryAsync(sql_num)
        .then(result=>{
            // console.log(res.json(result));//result回傳一份num的資料
            //拿到全部資料庫比數
            totalRows = result[0].num;
            //拿到總頁數(全資料筆數/每一頁資料筆數)
            totalPages = Math.ceil(totalRows/perPage);
            if(page < 1) page = 1;
            if(page > totalPages ) page = totalPages;
            //${(page-1)*perPage}, ${perPage}}limit 資料指定起始位置(不包括自己本身)*每頁6筆資料,每頁向下位移多少資料
            // const sql_order = `select * from \`sales\`.\`sid\` asc limit ${(page-1)*perPage}, ${perPage}`;
            //limit ${perPage} OFFSET ${(page-1)*perPage}如果使用offset則會相反 :limit 往後幾筆資料  offset 起始位置
            // const sql_order = `select * from \`sales\` order by \`sales\`.\`sid\` asc limit ${perPage} offset ${(page-1)*perPage}`;
            const sql_order = `SELECT * FROM \`sales\` ORDER BY \`sales\`.\`sid\` DESC LIMIT ${(page-1)*perPage}, ${perPage}`;
            // res.json(sql_order);
            return db.queryAsync(sql_order);
        })
        .then(result=>{
            const dateFm = "YYYY-MM-DD";

            result.forEach((row,idx)=>{
                // res.json(row);
                row.birthday = moment(row.birthday).format(dateFm);
            });

            res.render('connected_book/card',{
                totalRows,//value
                totalPages,//value
                page,//value
                url : req.url,
                rows: result//物件
            });
        });

});

//這裡必須輸出不然會有Router.use() requires a middleware function but got a Object問題
module.exports = router;