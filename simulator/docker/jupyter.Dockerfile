FROM jupyter/base-notebook
RUN mkdir -p /home/jovyan/data
RUN pip install --upgrade pip
RUN pip install pandas numpy plotly
COPY ./data /home/jovyan/data
EXPOSE 8888