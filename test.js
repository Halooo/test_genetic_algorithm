/**
 * Created by haos on 21/04/2017.
 */
const excelToJson = require('convert-excel-to-json');
const Je = require('jsonify-excel');
const filepath = './test.xlsx'; /*File Upload will replace this file on every submit*/

// read data from excel
const result = excelToJson({
    sourceFile: filepath,
    outputJSON: true,
    sheets: [{
        name: 'Visits',
        header: {
            rows: 1
        },
        columnToKey: {
            '*': '{{columnHeader}}'
        }

    },
        {
            name: 'Optimal Solution',
            header: {
                rows: 1
            },
            columnToKey: {
                '*': '{{columnHeader}}'
            }

        },
        {
            name: 'Feasible Packages',
            header: {
                rows: 2
            }
        }]
});

var all_sheets = result;
var feasible_packages = result["Feasible Packages"];
var visits = result["Visits"];
var optimal_sol = result["Optimal Solution"];

var tot_elem = Object.keys(feasible_packages[0]);
var tot_nurse = (tot_elem.length - 1) / 2;
var array_n = [];
var dup_array_n = [];

/*LIB2*/
const config = {
    automap: false,
    sheet: 1,
    start: 3
};
/*LIB2*/

var sep = 1, ser = 0;
for (var y = 1; y <= tot_nurse; y++) {
    /*LIB2*/
    const map = [{
        'SN': function (cell, row) {
            return parseInt(cell(tot_elem[ser]));
        },
        'Bundle': function (cell, row) {

            if (typeof cell(tot_elem[sep]) !== 'undefined') {
                var bundle_val = cell(tot_elem[sep]);
                var arr = bundle_val.split(",").map(function (val) {
                    return Number(val); //+ 1;
                });
                arr.sort(function (a, b) { //*SORT ARRAY FOR COMBINATIONS*//
                    return a - b;
                });
                return arr;
            } //if
        },
        'Price': function (cell, row) {
            return parseFloat(cell(tot_elem[sep + 1]));
        }
    }];
    var N1 = new Je(filepath).toJSON(config, map);//config, map ,,, {automap: true, start: 2, sheet:1}

    array_n.push(N1);
    dup_array_n.push(N1);
    /*LIB2*/
    sep = sep + 2;
}

var array_fin = [];
for (var o = array_n.length - 1; o >= 0; o--) {
    for (var p = array_n[o].length - 1; p >= 0; p--) {

        if (!array_n[o][p].Bundle) {

            array_n[o].splice(p, 1);
            //dup_array_n[o].splice(p, 1);
        }
    }
}

var visits_fin = [];
for (var iter = 0; iter < visits.length; iter++) {
    var spStd = visits[iter]["Standard Price"];
    var spStdRep = spStd.replace(/\$/, '');
    visits_fin.push({
        requestId: parseInt(visits[iter]["Request ID"]),
        standardPrice: parseFloat(spStdRep)
    });
}
/*EO Change Visits and Prices to Int and Float*/


// genetic algorithm to find best bundles
var used_bundles = [];

var diff;
var bundle_lst = [];


for (var nurse = 0; nurse < array_n.length; nurse++) {//var nurse=0; nurse<array_n.length; nurse++
    for (var bundle = 0; bundle < array_n[nurse].length; bundle++) {//var bundle=0; bundle<array_n[nurse].length; bundle++
        if (array_n[nurse][bundle].Bundle) {
            bundle_lst.push(array_n[nurse][bundle].Bundle);
        }
    }
}


var finalmagic = {
    left: Array.from(Array(15)).map((e,i)=>i+1),
    bundled: []
};

function runGenetic(cb) {
    var list1 = Array.from(Array(15)).map((e,i)=>i+1);
    var list1Cpy = JSON.parse(JSON.stringify(list1));
    var list2Cpy = JSON.parse(JSON.stringify(bundle_lst));
    var finalResult = [];
    while (list2Cpy.length !== 0) {
        finalResult.push(genetic(list1Cpy, list2Cpy));
    }
    console.log('LIST1 ', JSON.stringify(list1Cpy), 'LIST2 ', JSON.stringify(list2Cpy), 'FINAL ',JSON.stringify(finalResult));
    var magic = {
        left: list1Cpy,
        bundled: finalResult
    };
    // use >= if using weighted nodes
    if(finalmagic.left.length > list1Cpy) {
        finalmagic = magic
    }

    console.log(JSON.stringify(magic));
    list1Cpy = list1;
    list2Cpy = bundle_lst;
    cb();
}
// console.log('FINAL ', JSON.stringify(finalResult));

function asyncLoop(iterations, func, callback) {
    var index = 0;
    var done = false;
    var loop = {
        next: function() {
            if (done) {
                return;
            }

            if (index < iterations) {
                index++;
                func(loop);

            } else {
                done = true;
                callback();
            }
        },

        iteration: function() {
            return index - 1;
        },

        break: function() {
            done = true;
            callback();
        }
    };
    loop.next();
    return loop;
}

asyncLoop(1000, function(loop) {
        runGenetic(function(magic) {

            // log the iteration
            console.log(loop.iteration());

            // Okay, for cycle could continue
            loop.next();
        })},

    function(){
        console.log('FINAL MAGIC HAPPENED' ,JSON.stringify(finalmagic));
    }
);


function genetic(lst1, lst2) {
    var len1 = lst1.length;
    var len2 = lst2.length;

    var selectPos = Math.floor(Math.random() * len2);
    var toDel = JSON.parse(JSON.stringify(lst2[selectPos]));
    delEle(lst1, toDel);
    console.log('lst1', JSON.stringify(lst1));
    reduceSet(lst2, toDel);
    // console.log('toDel', JSON.stringify(toDel));
    return toDel;
}


function delEle(arr, ele) {
    for (var i = ele.length - 1; i >=0 ; i--) {
        arr.map(function (item, index) {
            if (item === ele[i]) {
                arr.splice(index, 1);
            }
        });
    }
    console.log(JSON.stringify(arr))
}

function reduceSet(set, ele) {
    for (var i = ele.length - 1; i >= 0 ; i--) {
        for (var bundle = set.length - 1; bundle >= 0; bundle--) {
            for (var j = set[bundle].length - 1; j >= 0; j--) {
                if (ele[i] === set[bundle][j]) {
                    set.splice(bundle, 1);
                    break;
                }
            }
        }
    }
}

// console.log("SelectedBundle=", SelectedBundle, "Arr_Selected", arr_selected, "Used Bundles", used_bundles, "array_n after removal of selected: ", JSON.stringify(array_n));