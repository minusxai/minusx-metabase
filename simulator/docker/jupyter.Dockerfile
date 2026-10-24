FROM python:3.13.17-alpine@sha256:fa0bb0d0cd7c7d6cef30a69094d32ac2b71c7304c87c6107fec100e1ee4eda02

RUN adduser -D -u 1000 -G users jovyan
COPY requirements.txt requirements.lock.txt refresh_pip_clients.py /tmp/notebook-environment/
RUN pip install --no-cache-dir --require-hashes -r /tmp/notebook-environment/requirements.lock.txt \
    && python /tmp/notebook-environment/refresh_pip_clients.py

WORKDIR /home/jovyan
RUN mkdir -p /home/jovyan/data && chown jovyan:users /home/jovyan/data
COPY --chown=1000:100 ./data /home/jovyan/data
USER 1000:100
EXPOSE 8888
CMD ["jupyter", "lab", "--ip=0.0.0.0", "--port=8888", "--no-browser"]
