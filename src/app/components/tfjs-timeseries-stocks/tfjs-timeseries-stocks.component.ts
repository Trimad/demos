import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { GlobalService } from "../../services/global.service";
import { TfjsTimeseriesStocksMain } from "./tfjs-timeseries-stocks-main";


@Component({
  selector: 'app-tfjs-timeseries-stocks',
  templateUrl: './tfjs-timeseries-stocks.component.html',
  styleUrls: ['./tfjs-timeseries-stocks.component.css']
})
export class TfjsTimeseriesStocksComponent implements OnInit {

  model: TfjsTimeseriesStocksMain;
  trained_model = {};

  data_raw = [];
  data_sma_vec = [];

  input_temporal_resolutions: string;
  input_ticker: string;
  input_apikey: string;
  demo_1_div_display: boolean;
  demo_1_loadingdata = false;
  demo_1_linegraph_title: string;
  demo_1_graph = {data:[], layout:{}};

  demo_2_ready = false;
  input_windowsize = 50;
  demo_2_div_display: boolean;
  demo_2_loadingdata = false;
  demo_2_graph = {data:[], layout:{}};
  demo_2_table = [];
  demo_2_table_columns: string[] = ['index', 'y', 'x'];

  demo_3_ready = false;
  demo_3_div_display = false;
  demo_3_loadingdata = false;
  input_trainingsize = 70;
  input_epochs = 5;
  input_learningrate = 0.01;
  input_hiddenlayers = 4;
  demo_3_traininglog = "";
  demo_3_progressbar = 0;
  demo_3_graph = {data:[], layout:{}};

  demo_4_ready = false;
  demo_4_div_display = false;
  demo_4_loadingdata = false;
  demo_4_graph = {data:[], layout:{}};

  demo_5_loadingdata = false;
  demo_5_div_display = false;
  demo_5_graph = {data:[], layout:{}};

  constructor(private service: GlobalService, private httpClient:HttpClient) {}

  ngOnInit() {
    this.service.changePageTitle('Time Series Forecasting');

    this.model = new TfjsTimeseriesStocksMain(this.httpClient);

    this.input_temporal_resolutions = 'Daily';
    this.input_ticker = 'AMZN';
    this.input_apikey = 'HGOAQJ6VUXCMEV6S';

    // this.onClickFetchData();
    // this.onClickDisplaySMA();
    // this.onClickTrainModel();
  }

  async onClickFetchData(){

    this.demo_1_loadingdata = true;

    let result = await this.model.demo_1_fetchData(this.input_ticker, this.input_apikey, this.input_temporal_resolutions);

    console.log(result);

    this.data_raw = result['data_raw'];

    this.demo_1_div_display = true;
    this.demo_1_linegraph_title = result['linegraph_title'];

    this.demo_1_graph = {
        data: [{ x: result['timestamps'], y: result['prices'] }],
        layout: {height: 350, title: result['linegraph_title'], autosize: true}
    };
    window.dispatchEvent(new Event('resize'));

    this.demo_1_loadingdata = false;
    this.demo_2_ready = true;

  }

  async onClickDisplaySMA(){

    this.demo_2_loadingdata = true;

    let result = await this.model.demo_2_compute_sma(this.data_raw, this.input_windowsize);
    console.log(result);

    this.data_sma_vec = result['data_sma_vec'];
    this.demo_2_table = result['demo_2_table'];

    this.demo_2_div_display = true;

    this.demo_2_graph = {
        data: [
          { x: result['timestamps_a'], y: result['prices'], name: "Stock Price" },
          { x: result['timestamps_b'], y: result['sma'], name: "SMA" }
        ],
        layout: {height: 350, title: "Stock Price and Simple Moving Average (window: " + this.input_windowsize + ")", autosize: true}
    };
    window.dispatchEvent(new Event('resize'));

    this.demo_2_loadingdata = false;
    this.demo_3_ready = true;

  }

  async onClickTrainModel(){

    this.demo_3_loadingdata = true;
    this.demo_3_div_display = true;

    let epoch_loss = [];
    this.demo_3_traininglog = "";

    let inputs = this.data_sma_vec.map(function(inp_f){
      return inp_f['set'].map(function(val) { return val['price']; })
    });
    let outputs = this.data_sma_vec.map(function(outp_f) { return outp_f['avg']; });

    let callback = function(epoch, log, model_params) {

      this.demo_3_traininglog = "<div>Epoch: " + (epoch + 1) + " (of "+ this.input_epochs +")" +
        ", loss: " + log.loss +
        "</div>" + this.demo_3_traininglog;

      epoch_loss.push(log.loss);

      console.log('log', log);

      this.demo_3_progressbar = Math.ceil(((epoch + 1) * (100 / this.input_epochs)));

      this.demo_3_graph = {
          data: [{x: Array.from({length: epoch_loss.length}, (v, k) => k+1), y: epoch_loss, name: "Loss" }],
          layout: {height: 350, title: "Training Loss", autosize: true}
      };
      window.dispatchEvent(new Event('resize'));
    };

    let model_params = {
      "inputs":inputs,
      "outputs":outputs,
      "input_trainingsize":this.input_trainingsize,
      "input_windowsize":this.input_windowsize,
      "input_epochs":this.input_epochs,
      "input_learningrate":this.input_learningrate,
      "input_hiddenlayers":this.input_hiddenlayers
    };

    this.trained_model = await this.model.trainModel(model_params, callback.bind(this));

    this.demo_3_traininglog = "<div>Model trained</div>" + this.demo_3_traininglog;
    this.demo_3_loadingdata = false;
    this.demo_4_ready = true;

  }

  async onClickValidate() {

    this.demo_4_loadingdata = true;
    this.demo_4_div_display = true;

    let inputs = this.data_sma_vec.map(function(inp_f) {
     return inp_f['set'].map(function (val) { return val['price']; });
    });
    // let outputs = this.data_sma_vec.map(function(outp_f) { return outp_f['avg']; });
    // let outps = outputs.slice(Math.floor(this.input_trainingsize / 100 * outputs.length), outputs.length);

    let pred_X = inputs.slice(Math.floor(this.input_trainingsize / 100 * inputs.length), inputs.length);

    let pred_Y = await this.model.makePredictions(pred_X, this.trained_model['model']);

    let timestamps_a = this.data_raw.map(function (val) { return val['timestamp']; });
    let timestamps_b = this.data_raw.map(function (val) {
      return val['timestamp'];
    // }).splice(this.input_windowsize, this.data_raw.length);
  }).splice(this.input_windowsize, (this.data_raw.length - Math.floor((100-this.input_trainingsize) / 100 * this.data_raw.length)));

    let timestamps_c = this.data_raw.map(function (val) {
      return val['timestamp'];
    }).splice(this.input_windowsize + Math.floor(this.input_trainingsize / 100 * this.data_raw.length), this.data_raw.length);

    let sma = this.data_sma_vec.map(function (val) { return val['avg']; });
    let prices = this.data_raw.map(function (val) { return val['price']; });

    this.demo_4_graph = {
        data: [
          { x: timestamps_a, y: prices, name: "Actual Price" },
          { x: timestamps_b, y: sma, name: "Training Label (SMA)" },
          { x: timestamps_c, y: pred_Y, name: "Predicted" }
        ],
        layout: {height: 350, title: "Predict Results", autosize: true}
    };
    window.dispatchEvent(new Event('resize'));

    this.demo_4_loadingdata = false;

  }

  async onClickPredict() {
    this.demo_5_loadingdata = true;
    this.demo_5_div_display = true;

    let inputs = this.data_sma_vec.map(function(inp_f) {
     return inp_f['set'].map(function (val) { return val['price']; });
    });
    let pred_X = [inputs[inputs.length-1]];

    let pred_y = await this.model.makePredictions(pred_X, this.trained_model['model']);

    let timestamps_d = this.data_raw.map(function (val) {
      return val['timestamp'];
    }).splice((this.data_raw.length - this.input_windowsize), this.data_raw.length);

    // date
    let last_date = new Date(timestamps_d[timestamps_d.length-1]);
    let add_days = 1;
    if(this.input_temporal_resolutions == 'Weekly'){
      add_days = 7;
    }
    last_date.setDate(last_date.getDate() + add_days);
    let next_date = await this.formatDate(last_date.toString());
    let timestamps_e = [next_date];

    this.demo_5_graph = {
        data: [
          { x: timestamps_d, y: pred_X[0], name: "Latest Trends" },
          { x: timestamps_e, y: pred_y, name: "Predicted Price" },
        ],
        layout: {height: 350, title: "Predict Results", autosize: true}
    };
    window.dispatchEvent(new Event('resize'));

    this.demo_5_loadingdata = false;
  }

  formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  }

}
